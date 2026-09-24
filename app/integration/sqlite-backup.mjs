import { chmod, copyFile, mkdir, readdir, rename, rm, stat } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { dirname, isAbsolute, join, resolve } from 'node:path';

async function database(file) {
  const { DatabaseSync } = await import('node:sqlite');
  return new DatabaseSync(file);
}

function assertPath(file, label) {
  if (!isAbsolute(file)) throw new Error(`${label} must be an absolute path.`);
  if (file.includes('\0')) throw new Error(`${label} contains an invalid path.`);
}

export async function sqliteIntegrity(file) {
  assertPath(file, 'SQLite file');
  const db = await database(file);
  try {
    const result = db.prepare('PRAGMA integrity_check').get();
    const value = result?.integrity_check;
    if (value !== 'ok') throw new Error(`SQLite integrity check failed: ${value || 'unknown result'}`);
    return value;
  } finally {
    db.close();
  }
}

async function digest(file) {
  const hash = createHash('sha256');
  hash.update(await (await import('node:fs/promises')).readFile(file));
  return hash.digest('hex');
}

export async function backupSQLite(sourceFile, backupFile) {
  assertPath(sourceFile, 'SQLite source');
  assertPath(backupFile, 'SQLite backup');
  if (resolve(sourceFile) === resolve(backupFile)) throw new Error('SQLite source and backup must differ.');
  await sqliteIntegrity(sourceFile);
  await mkdir(dirname(backupFile), { recursive: true, mode: 0o700 });
  const temporaryFile = `${backupFile}.${randomUUID()}.tmp`;
  const db = await database(sourceFile);
  try {
    db.prepare('VACUUM INTO ?').run(temporaryFile);
  } finally {
    db.close();
  }
  try {
    await chmod(temporaryFile, 0o600);
    await sqliteIntegrity(temporaryFile);
    await rename(temporaryFile, backupFile);
    return { sourceFile, backupFile, digest: await digest(backupFile), integrity: 'ok' };
  } catch (error) {
    await rm(temporaryFile, { force: true });
    throw error;
  }
}

export async function createSQLiteBackup(sourceFile, backupDirectory, { prefix = 'tennis', keep = 7, now = new Date() } = {}) {
  assertPath(backupDirectory, 'SQLite backup directory');
  if (!/^[a-z0-9][a-z0-9._-]*$/i.test(prefix)) throw new Error('Backup prefix contains unsupported characters.');
  if (!Number.isInteger(keep) || keep < 1) throw new Error('Backup retention must keep at least one backup.');
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const backupFile = join(backupDirectory, `${prefix}-${stamp}-${randomUUID()}.sqlite`);
  const receipt = await backupSQLite(sourceFile, backupFile);
  const removed = await pruneSQLiteBackups(backupDirectory, { prefix, keep });
  return { ...receipt, removed };
}

export async function pruneSQLiteBackups(directory, { prefix = 'tennis', keep = 7 } = {}) {
  assertPath(directory, 'SQLite backup directory');
  if (!Number.isInteger(keep) || keep < 1) throw new Error('Backup retention must keep at least one backup.');
  const entries = (await readdir(directory, { withFileTypes: true }).catch(error => error.code === 'ENOENT' ? [] : Promise.reject(error)))
    .filter(entry => entry.isFile() && entry.name.startsWith(`${prefix}-`) && entry.name.endsWith('.sqlite'));
  const withStats = await Promise.all(entries.map(async entry => ({ entry, stats: await stat(join(directory, entry.name)) })));
  withStats.sort((a, b) => b.stats.mtimeMs - a.stats.mtimeMs);
  const removed = [];
  for (const item of withStats.slice(keep)) {
    const file = join(directory, item.entry.name);
    await rm(file);
    removed.push(file);
  }
  return removed;
}

async function checkpoint(file) {
  const db = await database(file);
  try { db.exec('PRAGMA wal_checkpoint(TRUNCATE)'); } finally { db.close(); }
  await rm(`${file}-wal`, { force: true });
  await rm(`${file}-shm`, { force: true });
}

export async function restoreSQLiteBackup(backupFile, targetFile) {
  assertPath(backupFile, 'SQLite backup');
  assertPath(targetFile, 'SQLite target');
  if (resolve(backupFile) === resolve(targetFile)) throw new Error('SQLite backup and target must differ.');
  await sqliteIntegrity(backupFile);
  await mkdir(dirname(targetFile), { recursive: true, mode: 0o700 });
  const temporaryFile = `${targetFile}.${randomUUID()}.restore`;
  await copyFile(backupFile, temporaryFile);
  await chmod(temporaryFile, 0o600);
  await sqliteIntegrity(temporaryFile);
  const rollbackFile = `${targetFile}.${new Date().toISOString().replace(/[-:]/g, '')}.${randomUUID()}.rollback.sqlite`;
  const targetExists = await stat(targetFile).then(() => true).catch(error => error.code === 'ENOENT' ? false : Promise.reject(error));
  try {
    if (targetExists) {
      await checkpoint(targetFile);
      await rename(targetFile, rollbackFile);
      await chmod(rollbackFile, 0o600);
    }
    await rename(temporaryFile, targetFile);
    await sqliteIntegrity(targetFile);
    return { backupFile, targetFile, rollbackFile: targetExists ? rollbackFile : null, digest: await digest(targetFile), integrity: 'ok' };
  } catch (error) {
    await rm(temporaryFile, { force: true });
    await rm(targetFile, { force: true });
    if (targetExists) await rename(rollbackFile, targetFile);
    throw error;
  }
}

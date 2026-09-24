import assert from 'node:assert/strict';
import { mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { applySQLiteOperation, loadSQLiteState } from '../integration/sqlite-authority.mjs';
import { backupSQLite, createSQLiteBackup, restoreSQLiteBackup } from '../integration/sqlite-backup.mjs';

const directory = await mkdtemp(join(tmpdir(), 'fountain-coach-tennis-backup-'));
const database = join(directory, 'tennis.sqlite');
const backupDirectory = join(directory, 'backups');
const firstBackup = join(backupDirectory, 'manual.sqlite');

try {
  await loadSQLiteState(database);
  assert.equal((await applySQLiteOperation(database, 'generate_schedule', { confirm: true })).ok, true);
  const manual = await backupSQLite(database, firstBackup);
  assert.equal(manual.integrity, 'ok');
  assert.equal((await stat(firstBackup)).mode & 0o077, 0, 'backup must not be group/world accessible');

  assert.equal((await applySQLiteOperation(database, 'reset_schedule', { confirm: true })).ok, true);
  assert.equal((await loadSQLiteState(database)).schedule.length, 0);
  const restored = await restoreSQLiteBackup(firstBackup, database);
  assert.equal(restored.integrity, 'ok');
  assert.equal((await loadSQLiteState(database)).schedule.length, 30);
  assert.ok(restored.rollbackFile, 'restore must retain a rollback snapshot');

  const retained = [];
  for (let index = 0; index < 3; index += 1) retained.push(await createSQLiteBackup(database, backupDirectory, { prefix: 'retained', keep: 2, now: new Date(2026, 8, 24, 10, index) }));
  assert.equal(retained.length, 3);
  const files = (await import('node:fs/promises')).readdir(backupDirectory);
  assert.equal((await files).filter(file => file.startsWith('retained-') && file.endsWith('.sqlite')).length, 2);
  console.log('PASS SQLite recovery: integrity-checked backup, restrictive permissions, restore rollback and retention');
} finally {
  await rm(directory, { recursive: true, force: true });
}

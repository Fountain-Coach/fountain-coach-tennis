import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const directory = await mkdtemp(join(tmpdir(), 'fountain-coach-tennis-oauth-'));
const file = join(directory, 'tennis.sqlite');
const cwd = dirname(dirname(fileURLToPath(import.meta.url)));
const environment = { ...process.env, TENNIS_STATE_BACKEND: 'sqlite', TENNIS_SQLITE_FILE: file };
const create = spawnSync(process.execPath, ['--input-type=module', '-e', "import { createLocalOAuthSession } from './integration/oauth.mjs'; process.stdout.write(createLocalOAuthSession({ email: 'admin@example.test' }));"], { cwd, env: environment, encoding: 'utf8' });
assert.equal(create.status, 0, create.stderr);
const sessionToken = create.stdout.trim();
assert.ok(sessionToken);

try {
  const read = spawnSync(process.execPath, ['--input-type=module', '-e', "import { readOAuthSession } from './integration/oauth.mjs'; const session = readOAuthSession(process.argv[1]); if (!session) process.exit(2); process.stdout.write(JSON.stringify(session));", '--', sessionToken], { cwd, env: environment, encoding: 'utf8' });
  assert.equal(read.status, 0, read.stderr);
  assert.equal(JSON.parse(read.stdout).email, 'admin@example.test');
  const { DatabaseSync } = await import('node:sqlite');
  const database = new DatabaseSync(file);
  const row = database.prepare('SELECT key_hash, value_json FROM oauth_records WHERE collection = ?').get('sessions');
  assert.ok(row);
  assert.notEqual(row.key_hash, sessionToken, 'OAuth session tokens must not be stored as SQLite keys');
  assert.equal(row.value_json.includes(sessionToken), false, 'OAuth session tokens must not be stored in record values');
  database.close();
  console.log('PASS OAuth persistence: session survives process restart and token material is not stored');
} finally {
  await rm(directory, { recursive: true, force: true });
}

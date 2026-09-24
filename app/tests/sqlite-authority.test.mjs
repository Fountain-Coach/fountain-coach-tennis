import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { migrateSQLite, loadSQLiteState, applySQLiteOperation } from '../integration/sqlite-authority.mjs';

const directory = await mkdtemp(join(tmpdir(), 'fountain-coach-tennis-sqlite-'));
const file = join(directory, 'tennis.sqlite');

try {
  const first = await migrateSQLite(file);
  const second = await migrateSQLite(file);
  assert.equal(first.version, 1);
  assert.deepEqual(second.tables, first.tables, 'migration must be idempotent');
  assert.deepEqual(first.tables, [
    'matches', 'player_availability_rules', 'player_unavailability', 'players', 'schedule_days', 'schema_migrations', 'tennis_configuration'
  ]);

  const initial = await loadSQLiteState(file);
  assert.equal(initial.players.length, 12);
  assert.equal(initial.schedule.length, 0);
  assert.equal(initial.configuration.matchesPerDay, 5);

  const configuration = { ...initial.configuration, matchDurationMinutes: 90 };
  const updated = await applySQLiteOperation(file, 'update_configuration', { confirm: true, configuration });
  assert.equal(updated.ok, true);
  assert.equal(updated.model.configuration.matchDurationMinutes, 90);

  const generated = await applySQLiteOperation(file, 'generate_schedule', { confirm: true });
  assert.equal(generated.ok, true);
  assert.equal(generated.model.schedule.length, 30);
  assert.equal((await loadSQLiteState(file)).schedule.length, 30);

  const rejected = await applySQLiteOperation(file, 'update_configuration', {
    confirm: true,
    configuration: { ...configuration, matchesPerDay: 4 }
  });
  assert.equal(rejected.ok, false);
  assert.equal((await loadSQLiteState(file)).configuration.matchesPerDay, 5);
  console.log('PASS SQLite authority: normalized schema, idempotent migration, transactional persistence and rejection');
} finally {
  await rm(directory, { recursive: true, force: true });
}

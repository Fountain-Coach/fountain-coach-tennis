import assert from 'node:assert/strict';
import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {applyOperation, emptyState, loadState, readModel, validateConfiguration} from '../integration/tennis-service.mjs';

const directory = await mkdtemp(join(tmpdir(), 'fountain-coach-tennis-authority-'));
const stateFile = join(directory, 'state.json');

try {
  const initial = emptyState();
  assert.equal(initial.configuration.matchesPerDay, 5);
  assert.deepEqual(readModel(initial).configuration.times, ['12:00', '13:00', '14:00', '15:00', '16:00']);
  assert.deepEqual(validateConfiguration(initial.configuration), []);

  const updated = await applyOperation(stateFile, 'update_configuration', {
    configuration: {
      seasonStart: '2026-10-03',
      seasonEnd: '2026-10-03',
      weekdays: [7],
      times: ['09:00', '10:30', '12:00', '13:30', '15:00'],
      matchDurationMinutes: 90,
      matchesPerDay: 5
    }
  });
  assert.equal(updated.ok, true);
  assert.deepEqual(updated.model.configuration.times, ['09:00', '10:30', '12:00', '13:30', '15:00']);

  const generated = await applyOperation(stateFile, 'generate_schedule');
  assert.equal(generated.ok, true);
  assert.equal(generated.model.schedule.length, 1);
  assert.deepEqual(generated.model.schedule[0].matches.map(match => match.time), ['09:00', '10:30', '12:00', '13:30', '15:00']);
  assert.deepEqual((await loadState(stateFile)).configuration.times, ['09:00', '10:30', '12:00', '13:30', '15:00']);

  assert.equal((await applyOperation(stateFile, 'reset_schedule')).ok, true);
  const imported = await applyOperation(stateFile, 'import_state', {
    state: {
      players: initial.players,
      schedule: [],
      configuration: initial.configuration,
      generatedAt: null
    }
  });
  assert.equal(imported.ok, true);
  assert.equal((await loadState(stateFile)).players.length, initial.players.length);
  const compact = await applyOperation(stateFile, 'update_configuration', {
    configuration: {
      seasonStart: '2026-10-03',
      seasonEnd: '2026-10-03',
      weekdays: [7],
      times: ['09:00', '10:30', '12:00'],
      matchDurationMinutes: 90,
      matchesPerDay: 3
    }
  });
  assert.equal(compact.ok, true);
  const compactGenerated = await applyOperation(stateFile, 'generate_schedule');
  assert.equal(compactGenerated.ok, true);
  assert.deepEqual(compactGenerated.model.schedule[0].matches.map(match => match.time), ['09:00', '10:30', '12:00']);

  const rejected = await applyOperation(stateFile, 'update_configuration', {
    configuration: { times: ['09:00'], matchesPerDay: 5 }
  });
  assert.equal(rejected.ok, false);
  assert.deepEqual((await loadState(stateFile)).configuration.times, ['09:00', '10:30', '12:00']);
  console.log('PASS authority boundary: configuration is server-owned, validated, and durable');
} finally {
  await rm(directory, {recursive: true, force: true});
}

import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const inventory = JSON.parse(await readFile(new URL('../scenarios/tennis-feature-inventory.json', import.meta.url), 'utf8'));
const browserSource = await readFile(new URL('../src/tennis.js', import.meta.url), 'utf8');
const serviceSource = await readFile(new URL('../integration/tennis-service.mjs', import.meta.url), 'utf8');

assert.equal(inventory.schemaVersion, 'fountain-coach.tennis-feature-inventory.v1');
for (const key of inventory.localStorageKeys) assert(browserSource.includes(key), 'missing browser persistence key: ' + key);
for (const operation of inventory.operations) {
  const expected = "operation === '" + operation + "'";
  assert(serviceSource.includes(expected), 'missing server operation: ' + operation);
}
assert.equal(inventory.authority.serverService, 'app/integration/tennis-service.mjs');
assert.equal(inventory.authority.futurePersistence, 'server-authoritative SQLite');
console.log('PASS feature inventory: observed persistence and server operations are represented');

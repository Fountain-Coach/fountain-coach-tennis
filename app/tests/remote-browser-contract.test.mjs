import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const port = 8821;
const token = 'remote-browser-contract-token';
const directory = await mkdtemp(join(tmpdir(), 'fountain-coach-tennis-remote-'));
const server = spawn(process.execPath, ['mcp-server.mjs'], {
  cwd: new URL('..', import.meta.url),
  env: { ...process.env, PORT: String(port), MCP_BEARER_TOKEN: token, TENNIS_STATE_FILE: join(directory, 'state.json'), TENNIS_AUDIT_FILE: join(directory, 'audit.jsonl') },
  stdio: ['ignore', 'pipe', 'pipe']
});
let output = '';
server.stdout.on('data', chunk => { output += chunk; });
server.stderr.on('data', chunk => { output += chunk; });

try {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try { if ((await fetch(`http://127.0.0.1:${port}/healthz`)).ok) break; } catch { /* server is starting */ }
    await new Promise(resolve => setTimeout(resolve, 50));
    if (attempt === 59) throw new Error(`server did not start: ${output}`);
  }
  const unauthenticatedSession = await fetch(`http://127.0.0.1:${port}/auth/session`);
  assert.equal(unauthenticatedSession.status, 200, 'the browser gate must have a session endpoint');
  assert.equal((await unauthenticatedSession.json()).authenticated, false, 'an unauthenticated browser must not enter the app');
  const stateResponse = await fetch(`http://127.0.0.1:${port}/api/state`, { headers: { authorization: `Bearer ${token}` } });
  assert.equal(stateResponse.status, 200, 'authenticated state read must be available to the app authority');
  const state = await stateResponse.json();
  const operationResponse = await fetch(`http://127.0.0.1:${port}/api/operation`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ operation: 'generate_schedule', input: { confirm: true, state } })
  });
  assert.equal(operationResponse.status, 200, 'authenticated schedule generation must be accepted');
  assert.equal((await operationResponse.json()).ok, true);
  const configurationResponse = await fetch(`http://127.0.0.1:${port}/api/operation`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ operation: 'update_configuration', input: { confirm: true, configuration: { ...state.configuration, matchDurationMinutes: 90 } } })
  });
  assert.equal(configurationResponse.status, 200, 'authenticated configuration update must be accepted');
  const persistedResponse = await fetch(`http://127.0.0.1:${port}/api/state`, { headers: { authorization: `Bearer ${token}` } });
  const persisted = await persistedResponse.json();
  assert.equal(persisted.schedule.length, 30, 'authenticated write must be persisted in the shared server authority');
  assert.equal(persisted.configuration.matchDurationMinutes, 90, 'configuration must be persisted in the shared server authority');
  console.log('PASS remote authority contract: authenticated app API and server share persisted state');
} finally {
  server.kill('SIGTERM');
  await rm(directory, { recursive: true, force: true });
}

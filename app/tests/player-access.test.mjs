import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { emptyState, saveState } from '../integration/tennis-service.mjs';
import { generateSchedule } from '../src/tennis-core.js';

const port = 8822;
const directory = await mkdtemp(join(tmpdir(), 'fountain-coach-tennis-player-'));
const stateFile = join(directory, 'state.json');
const state = emptyState();
state.schedule = generateSchedule(state.players, state.configuration);
await saveState(stateFile, state);
const server = spawn(process.execPath, ['mcp-server.mjs'], {
  cwd: new URL('..', import.meta.url),
  env: { ...process.env, PORT: String(port), TENNIS_LOCAL_AUTH: '1', TENNIS_LOCAL_AUTH_EMAIL: 'player@example.test', TENNIS_PLAYER_IDENTITIES: 'player@example.test=p1', TENNIS_STATE_FILE: stateFile, TENNIS_AUDIT_FILE: join(directory, 'audit.jsonl') },
  stdio: ['ignore', 'pipe', 'pipe']
});
let output = '';
server.stdout.on('data', chunk => { output += chunk; });
server.stderr.on('data', chunk => { output += chunk; });
const base = `http://127.0.0.1:${port}`;

try {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try { if ((await fetch(`${base}/healthz`)).ok) break; } catch { /* server is starting */ }
    await new Promise(resolve => setTimeout(resolve, 50));
    if (attempt === 59) throw new Error(`server did not start: ${output}`);
  }
  const login = await fetch(`${base}/auth/login`, { redirect: 'manual' });
  const authorizeUrl = new URL(login.headers.get('location'), base);
  const authorize = await fetch(`${base}${authorizeUrl.pathname}${authorizeUrl.search}`);
  const stateToken = authorizeUrl.searchParams.get('state');
  const approval = await fetch(`${base}/local-oauth/authorize`, { method: 'POST', redirect: 'manual', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ state: stateToken }) });
  const callback = await fetch(`${base}${new URL(approval.headers.get('location'), base).pathname}${new URL(approval.headers.get('location'), base).search}`, { redirect: 'manual' });
  const cookie = callback.headers.get('set-cookie').split(';', 1)[0];
  const session = await fetch(`${base}/auth/session`, { headers: { cookie } });
  assert.deepEqual((await session.json()).role, 'player');
  const response = await fetch(`${base}/api/state`, { headers: { cookie } });
  assert.equal(response.status, 200);
  const view = await response.json();
  assert(view.schedule.length > 0 && view.schedule.every(day => day.matches.every(match => match.a === 'p1' || match.b === 'p1')));
  assert(view.players.some(player => player.id === 'p1'));
  assert(view.players.filter(player => player.id !== 'p1').every(player => !('unavailable' in player)), 'opponent availability must not be exposed');
  const write = await fetch(`${base}/api/operation`, { method: 'POST', headers: { cookie, 'content-type': 'application/json' }, body: JSON.stringify({ operation: 'generate_schedule', input: { confirm: true } }) });
  assert.equal(write.status, 401, 'player sessions must not mutate the shared schedule');
  console.log('PASS player access: identity mapping, filtered schedule and read-only boundary');
} finally {
  server.kill('SIGTERM');
  await rm(directory, { recursive: true, force: true });
}

import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const port = 8817;
const token = 'contract-test-token';
const stateDir = await mkdtemp(join(tmpdir(), 'fountain-coach-tennis-'));
const stateFile = join(stateDir, 'state.json');
const child = spawn(process.execPath, ['mcp-server.mjs'], {
  cwd: new URL('..', import.meta.url),
  env: { ...process.env, PORT: String(port), MCP_BEARER_TOKEN: token, TENNIS_STATE_FILE: stateFile, TENNIS_AUDIT_FILE: join(stateDir, 'audit.jsonl') },
  stdio: ['ignore', 'pipe', 'pipe']
});
let output = '';
child.stdout.on('data', chunk => { output += chunk; });
child.stderr.on('data', chunk => { output += chunk; });

async function waitForServer() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try { await fetch(`http://127.0.0.1:${port}/`); return; } catch { await new Promise(resolve => setTimeout(resolve, 50)); }
  }
  throw new Error(`MCP server did not start: ${output}`);
}

function parseSse(text) {
  const data = text.split('\n').find(line => line.startsWith('data: '));
  return data ? JSON.parse(data.slice(6)) : null;
}

const endpoint = `http://127.0.0.1:${port}/mcp`;
const auth = { authorization: `Bearer ${token}`, 'content-type': 'application/json', accept: 'application/json, text/event-stream' };

async function rpc(sessionId, id, method, params = {}) {
  const response = await fetch(endpoint, {
    method: 'POST', headers: { ...auth, ...(sessionId ? { 'mcp-session-id': sessionId } : {}) },
    body: JSON.stringify({ jsonrpc: '2.0', id, method, params })
  });
  assert.equal(response.status, 200, `${method} returned ${response.status}`);
  return parseSse(await response.text());
}

try {
  await waitForServer();
  const unauthorized = await fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
  assert.equal(unauthorized.status, 401, 'MCP must reject missing bearer authentication');
  const discovery = await fetch(`http://127.0.0.1:${port}/.well-known/fountain-coach-tennis.json`);
  assert.equal(discovery.status, 200, 'discovery document must be reachable');
  assert.equal((await discovery.json()).mcpEndpoint, '/mcp');
  const health = await fetch(`http://127.0.0.1:${port}/healthz`);
  assert.deepEqual(await health.json(), { ok: true, service: 'fountain-coach-tennis' });
  const apiUnauthorized = await fetch(`http://127.0.0.1:${port}/api/state`);
  assert.equal(apiUnauthorized.status, 401, 'state API must reject missing bearer authentication');
  const apiState = await fetch(`http://127.0.0.1:${port}/api/state`, { headers: { authorization: `Bearer ${token}` } });
  assert.equal(apiState.status, 200, 'authenticated state API must be reachable');
  assert.equal((await apiState.json()).players.length, 12);
  const apiUnconfirmed = await fetch(`http://127.0.0.1:${port}/api/operation`, { method: 'POST', headers: { ...auth }, body: JSON.stringify({ operation: 'generate_schedule', input: {} }) });
  assert.equal(apiUnconfirmed.status, 403, 'API writes must require explicit confirmation');
  const apiGenerated = await fetch(`http://127.0.0.1:${port}/api/operation`, { method: 'POST', headers: { ...auth }, body: JSON.stringify({ operation: 'generate_schedule', input: { confirm: true } }) });
  assert.equal(apiGenerated.status, 200, 'authenticated confirmed API write must succeed');
  assert.equal((await apiGenerated.json()).model.schedule.length, 30);

  const initResponse = await fetch(endpoint, {
    method: 'POST', headers: auth,
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'contract-test', version: '1.0' } } })
  });
  assert.equal(initResponse.status, 200);
  const sessionId = initResponse.headers.get('mcp-session-id');
  assert.ok(sessionId, 'initialize must return a session id');
  assert.equal(parseSse(await initResponse.text()).result.serverInfo.name, 'fountain-coach-tennis');

  const tools = await rpc(sessionId, 2, 'tools/list');
  const toolNames = tools.result.tools.map(tool => tool.name);
  assert.deepEqual(toolNames, [
    'tennis_get_schedule', 'tennis_get_players', 'tennis_get_analysis', 'tennis_generate_schedule', 'tennis_add_player',
    'tennis_update_player', 'tennis_update_availability', 'tennis_update_fixed_time', 'tennis_edit_match', 'tennis_reset_schedule'
  ]);
  const resetTool = tools.result.tools.find(tool => tool.name === 'tennis_reset_schedule');
  assert.equal(resetTool.annotations.destructiveHint, true);
  assert.equal(resetTool.annotations.readOnlyHint, false);

  const players = await rpc(sessionId, 3, 'tools/call', { name: 'tennis_get_players', arguments: {} });
  assert.equal(JSON.parse(players.result.content[0].text).players.length, 12);

  const unconfirmed = await rpc(sessionId, 4, 'tools/call', { name: 'tennis_generate_schedule', arguments: {} });
  assert.equal(JSON.parse(unconfirmed.result.content[0].text).ok, false, 'writes must require explicit confirmation');
  const generated = await rpc(sessionId, 5, 'tools/call', { name: 'tennis_generate_schedule', arguments: { confirm: true } });
  const generatedPayload = JSON.parse(generated.result.content[0].text);
  assert.equal(generatedPayload.ok, true);
  assert.equal(generatedPayload.model.schedule.length, 30);
  assert.equal(generatedPayload.model.validation.valid, true);

  const invalid = await rpc(sessionId, 6, 'tools/call', { name: 'tennis_edit_match', arguments: { confirm: true, date: '2026-10-03', time: '12:00', player1: 'p1', player2: 'p1' } });
  const invalidPayload = JSON.parse(invalid.result.content[0].text);
  assert.equal(invalidPayload.ok, false);
  assert.ok(invalidPayload.message.includes('unterschiedliche'));

  const analysis = await rpc(sessionId, 7, 'tools/call', { name: 'tennis_get_analysis', arguments: {} });
  assert.equal(JSON.parse(analysis.result.content[0].text).validation.valid, true);
  console.log('PASS MCP contract: authentication, discovery, reads, writes and rejection policy');
} finally {
  child.kill('SIGTERM');
  await rm(stateDir, { recursive: true, force: true });
}

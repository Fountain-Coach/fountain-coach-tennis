import express from 'express';
import { appendFile, mkdir } from 'node:fs/promises';
import { randomUUID, timingSafeEqual } from 'node:crypto';
import rateLimit from 'express-rate-limit';
import { resolve } from 'node:path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import * as z from 'zod/v4';
import { emptyState, readModel } from './integration/tennis-service.mjs';
import { createTennisAuthority } from './integration/tennis-authority.mjs';
import { approveOAuthConsent, authorizeOAuthRequest, beginOAuth, beginOAuthConsent, completeOAuth, createLocalOAuthSession, configuredProviderName, configuredProviders, exchangeAuthorizationCode, isAdminIdentity, oauthMetadata, oauthSessionCookie, playerIdForIdentity, protectedResourceMetadata, readOAuthAccessToken, readOAuthSession, refreshOAuthToken, registerOAuthClient, revokeOAuthSession, roleForIdentity } from './integration/oauth.mjs';

const port = Number(process.env.PORT || 8787);
const stateFile = resolve(process.env.TENNIS_STATE_FILE || '.runtime/tennis-state.json');
const sqliteFile = resolve(process.env.TENNIS_SQLITE_FILE || '.runtime/tennis.sqlite');
const authority = createTennisAuthority({ stateFile, sqliteFile });
const bearerToken = process.env.MCP_BEARER_TOKEN || '';
const staticRoot = resolve(new URL('.', import.meta.url).pathname);
const publicRoot = resolve(process.env.TENNIS_PUBLIC_ROOT || staticRoot);
const auditFile = resolve(process.env.TENNIS_AUDIT_FILE || '.runtime/audit.jsonl');
const transports = new Map();
const configuredOrigins = (process.env.CORS_ORIGINS || '').split(',').map(value => value.trim()).filter(Boolean);
const nativeBridgeUrl = process.env.TENNIS_NATIVE_BRIDGE_URL || '';
const nativeTenantId = process.env.TENNIS_NATIVE_TENANT_ID || '';
const nativeUserId = process.env.TENNIS_NATIVE_USER_ID || '';
const nativeBearerToken = process.env.TENNIS_NATIVE_BEARER_TOKEN || bearerToken;
const localAuthEnabled = process.env.NODE_ENV !== 'production' && process.env.TENNIS_LOCAL_AUTH === '1';
const localAuthEmail = String(process.env.TENNIS_LOCAL_AUTH_EMAIL || 'local-admin@example.test').trim().toLowerCase();
const localOAuthRequests = new Map();
const localOAuthCodes = new Map();

if (process.env.NODE_ENV === 'production' && !bearerToken && (!process.env.TENNIS_ADMIN_EMAILS || !configuredProviders(process.env)[process.env.OAUTH_IDP || 'google'])) {
  throw new Error('Production requires a static bearer token or configured Tennis admin OAuth.');
}
if (process.env.NODE_ENV === 'production' && process.env.TENNIS_ADMIN_EMAILS && !/^https:\/\//.test(String(process.env.OAUTH_ISSUER || ''))) {
  throw new Error('Production Tennis OAuth requires an HTTPS OAUTH_ISSUER.');
}
if (process.env.NODE_ENV === 'production' && process.env.TENNIS_NATIVE_REQUIRED === '1' && (!nativeBridgeUrl || !nativeTenantId || !nativeUserId || !nativeBearerToken)) {
  throw new Error('Native Tennis bridge, tenant, user and bearer configuration are required in production.');
}

const nativeOperation = {
  generate_schedule: 'schedule.generate', add_player: 'player.add', update_player: 'player.update',
  update_availability: 'availability.update', update_fixed_time: 'availability.update',
  edit_match: 'match.update', reset_schedule: 'schedule.reset'
};

async function callNative(topic, operation, input = {}) {
  const payload = { ...input };
  delete payload.confirm;
  delete payload.state;
  const response = await fetch(nativeBridgeUrl, {
    method: 'POST',
    headers: { Authorization: `Bearer ${nativeBearerToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic, request: {
      operation, tenantId: nativeTenantId, userId: nativeUserId, correlationId: randomUUID(),
      ...(topic.endsWith('.mutate') ? { idempotencyKey: randomUUID(), confirmation: input.confirm === true } : {}),
      payload: { ...Object.fromEntries(Object.entries(payload).map(([key, value]) => [key, String(value)])),
        ...(input.state ? { stateJSON: JSON.stringify(input.state) } : {}) }
    } })
  });
  const result = await response.json();
  if (!response.ok || !result.ok) throw new Error(result.error || result.body?.result?.lifecycle || 'Native Tennis bridge rejected request.');
  return result.body?.result || {};
}

async function nativeModel() {
  const result = await callNative('fountainstore/tennis.schedule.query', 'schedule.query');
  if (!result.stateJSON) return readModel(emptyState());
  const state = JSON.parse(result.stateJSON);
  return readModel(state);
}

function authorized(request, write = false) {
  const received = request.headers.authorization || '';
  const expected = `Bearer ${bearerToken}`;
  if (bearerToken && received.length === expected.length && timingSafeEqual(Buffer.from(received), Buffer.from(expected))) return { mode: 'static', scope: 'tennis.read tennis.write' };
  const token = received.startsWith('Bearer ') ? readOAuthAccessToken(received.slice(7)) : null;
  const expectedResource = `${publicBaseUrl(request)}/mcp`;
  const tokenRole = roleForIdentity(token, process.env);
  if (token && (!token.resource || token.resource === expectedResource) && tokenRole && (!write ? token.scope.split(' ').includes('tennis.read') : tokenRole === 'admin' && token.scope.split(' ').includes('tennis.write'))) return { mode: 'oauth', role: tokenRole, playerId: playerIdForIdentity(token, process.env), ...token };
  const session = readOAuthSession(cookies(request).tennis_oauth_session);
  const sessionRole = roleForIdentity(session, process.env);
  if (session && sessionRole && (!write || sessionRole === 'admin')) return { mode: 'oauth-session', role: sessionRole, playerId: playerIdForIdentity(session, process.env), ...session, scope: 'tennis.read tennis.write' };
  return !bearerToken && !write && process.env.TENNIS_ALLOW_ANONYMOUS_READ === '1' ? { mode: 'development' } : null;
}

function playerReadModel(model, playerId) {
  const schedule = model.schedule.map(day => ({ ...day, matches: day.matches.filter(match => match.a === playerId || match.b === playerId) })).filter(day => day.matches.length);
  const matchPlayerIds = new Set([playerId, ...schedule.flatMap(day => day.matches.flatMap(match => [match.a, match.b])).filter(Boolean)]);
  const ownPlayer = model.players.find(player => player.id === playerId);
  return {
    ...model,
    players: model.players.filter(player => matchPlayerIds.has(player.id)).map(player => player.id === playerId ? player : ({ id: player.id, name: player.name, active: player.active })),
    schedule,
    analysis: null,
    absences: ownPlayer ? model.absences.filter(day => day.players.includes(ownPlayer.name)) : [],
    validation: { valid: true, errors: [] }
  };
}

function textResult(payload) {
  return { content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }], structuredContent: payload };
}

async function recordAudit(operation, ok) {
  await mkdir(resolve(auditFile, '..'), { recursive: true, mode: 0o700 });
  await appendFile(auditFile, `${JSON.stringify({ at: new Date().toISOString(), operation, ok })}\n`, { encoding: 'utf8', mode: 0o600 });
}

function createServer() {
  const server = new McpServer({ name: 'fountain-coach-tennis', version: '1.0.0' });
  const readTool = (name, description, handler, inputSchema = {}) => server.registerTool(name, {
    description,
    inputSchema,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true }
  }, async input => textResult(await handler(input)));
  const writeTool = (name, description, operation, inputSchema) => server.registerTool(name, {
    description: `${description} Diese Aktion verändert den Spielplan und muss vom Nutzer in ChatGPT bestätigt werden.`,
    inputSchema,
    annotations: { readOnlyHint: false, destructiveHint: operation === 'reset_schedule', idempotentHint: false }
  }, async input => {
    if (input.confirm !== true) {
      await recordAudit(operation, false);
      return textResult({ ok: false, message: 'Diese Änderung benötigt eine ausdrückliche Nutzerbestätigung (confirm: true).' });
    }
    const result = await authority.apply(operation, input);
    await recordAudit(operation, result.ok);
    return textResult(result);
  });

  readTool('tennis_get_schedule', 'Liest Spielplan, Spieler, Abwesenheiten und Validierung.', async ({ date, playerId }) => {
    const model = readModel(await authority.load());
    if (date) model.schedule = model.schedule.filter(day => day.date === date);
    if (playerId) model.schedule = model.schedule.map(day => ({ ...day, matches: day.matches.filter(match => match.a === playerId || match.b === playerId) }));
    return model;
  }, {
    date: z.string().optional().describe('Optionales ISO-Datum YYYY-MM-DD'),
    playerId: z.string().optional().describe('Optionaler Spielerfilter')
  });
  readTool('tennis_get_players', 'Liest die aktuelle Spielerliste und Verfügbarkeiten.', async () => {
    const model = readModel(await authority.load());
    return { players: model.players, validation: model.validation };
  });
  readTool('tennis_get_analysis', 'Liest Fairness, Spiele pro Spieler, Paarungen und Abwesenheiten.', async () => {
    const model = readModel(await authority.load());
    return { analysis: model.analysis, absences: model.absences, validation: model.validation };
  });
  const confirmation = { confirm: z.boolean().default(false).describe('Muss nach ausdrücklicher Nutzerbestätigung true sein.') };
  writeTool('tennis_generate_schedule', 'Erzeugt den vollständigen Spielplan nach den hinterlegten Regeln.', 'generate_schedule', confirmation);
  writeTool('tennis_add_player', 'Fügt eine neue aktive Person ohne feste Regeln hinzu.', 'add_player', {
    ...confirmation, name: z.string()
  });
  writeTool('tennis_update_player', 'Ändert Name, Aktivstatus oder feste 12-/16-Uhr-Zuordnung.', 'update_player', {
    ...confirmation, playerId: z.string(), name: z.string().optional(), active: z.boolean().optional(), fixedFirst: z.boolean().optional(), fixedLast: z.boolean().optional()
  });
  writeTool('tennis_update_availability', 'Setzt die Abwesenheitsdaten eines Spielers.', 'update_availability', {
    ...confirmation, playerId: z.string(), unavailable: z.array(z.string()).describe('ISO-Daten YYYY-MM-DD')
  });
  writeTool('tennis_update_fixed_time', 'Setzt eine feste erste oder letzte Spielzeit.', 'update_fixed_time', {
    ...confirmation, playerId: z.string(), slot: z.enum(['first', 'last']), enabled: z.boolean()
  });
  writeTool('tennis_edit_match', 'Ändert eine konkrete Paarung, sofern der gesamte Plan gültig bleibt.', 'edit_match', {
    ...confirmation, date: z.string(), time: z.string(), player1: z.string(), player2: z.string()
  });
  writeTool('tennis_reset_schedule', 'Löscht den erzeugten Spielplan, Spieler bleiben erhalten.', 'reset_schedule', confirmation);
  return server;
}

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false, limit: '20kb' }));
app.use((request, response, next) => {
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('X-Frame-Options', 'DENY');
  response.setHeader('Referrer-Policy', 'no-referrer');
  response.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'self'");
  const origin = request.headers.origin;
  if (origin && configuredOrigins.includes(origin)) response.setHeader('Access-Control-Allow-Origin', origin);
  response.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, MCP-Session-Id, MCP-Protocol-Version, Last-Event-ID');
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  if (request.method === 'OPTIONS') return response.sendStatus(204);
  next();
});
const apiLimiter = rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: 'draft-7', legacyHeaders: false, message: { error: 'Zu viele Anfragen. Bitte später erneut versuchen.' } });
const mcpLimiter = rateLimit({ windowMs: 60_000, limit: 60, standardHeaders: 'draft-7', legacyHeaders: false, message: { error: 'Zu viele MCP-Anfragen. Bitte später erneut versuchen.' } });
app.get('/.well-known/fountain-coach-tennis.json', (request, response) => response.sendFile(resolve(staticRoot, '.well-known/fountain-coach-tennis.json'), { dotfiles: 'allow' }));
const cookies = request => Object.fromEntries((request.headers.cookie || '').split(';').map(value => value.trim().split('=' , 2)).filter(([key, value]) => key && value).map(([key, value]) => [key, decodeURIComponent(value)]));
const publicBaseUrl = request => String(process.env.OAUTH_ISSUER || `${request.protocol}://${request.get('host')}`).replace(/\/$/, '');
const escapeHTML = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
const consentHTML = token => `<!doctype html><meta charset="utf-8"><title>Tennisrunde – Zugriff bestätigen</title><main><h1>Privater Tennis-Spielplan</h1><p>ChatGPT darf den geschützten Spielplan für den zugelassenen Admin lesen und – nach jeder weiteren Bestätigung – ändern.</p><form method="post" action="/oauth/consent"><input type="hidden" name="consent_token" value="${escapeHTML(token)}"><button name="decision" value="approve">Zugriff erlauben</button><button name="decision" value="deny">Ablehnen</button></form></main>`;
app.get('/.well-known/oauth-authorization-server', (request, response) => response.json(oauthMetadata(publicBaseUrl(request))));
app.get('/.well-known/oauth-protected-resource/mcp', (request, response) => response.json(protectedResourceMetadata(publicBaseUrl(request))));
app.post('/oauth/register', (request, response) => {
  try { response.status(201).json(registerOAuthClient({ redirectUris: request.body?.redirect_uris, clientName: request.body?.client_name })); }
  catch (error) { response.status(400).json({ error: 'invalid_client_metadata', error_description: error.message }); }
});
app.get('/oauth/authorize', (request, response) => {
  try {
    const params = {
      clientId: request.query.client_id,
      redirectUri: request.query.redirect_uri,
      state: request.query.state,
      codeChallenge: request.query.code_challenge,
      codeChallengeMethod: request.query.code_challenge_method,
      scope: request.query.scope,
      resource: request.query.resource
    };
    const session = readOAuthSession(cookies(request).tennis_oauth_session);
    if (session) {
      return response.type('html').send(consentHTML(beginOAuthConsent(session, params, process.env)));
    }
    const login = authorizeOAuthRequest(params, process.env);
    response.redirect(302, login.authorizationUrl);
  } catch (error) { response.status(400).json({ error: 'invalid_request', error_description: error.message }); }
});
app.post('/oauth/token', (request, response) => {
  try {
    const body = request.body || {};
    const token = body.grant_type === 'refresh_token'
      ? refreshOAuthToken({ refreshToken: body.refresh_token, clientId: body.client_id, resource: body.resource })
      : exchangeAuthorizationCode({ code: body.code, clientId: body.client_id, redirectUri: body.redirect_uri, codeVerifier: body.code_verifier, resource: body.resource });
    response.setHeader('Cache-Control', 'no-store');
    response.json(token);
  } catch (error) { response.status(400).json({ error: 'invalid_grant', error_description: error.message }); }
});
app.get('/auth/:provider/start', (request, response) => {
  try {
    const login = beginOAuth(request.params.provider);
    response.redirect(302, login.authorizationUrl);
  } catch (error) {
    response.status(503).json({ ok: false, error: error.message });
  }
});
app.get('/auth/login', (request, response) => {
  if (localAuthEnabled) {
    const state = randomUUID();
    localOAuthRequests.set(state, { state, createdAt: Date.now() });
    return response.redirect(303, `/local-oauth/authorize?${new URLSearchParams({ client_id: 'tennis-local-web', redirect_uri: '/auth/local/callback', response_type: 'code', scope: 'openid tennis.read tennis.write', state }).toString()}`);
  }
  try {
    const login = beginOAuth(configuredProviderName(process.env));
    response.redirect(302, login.authorizationUrl);
  } catch {
    response.status(503).json({ ok: false, error: 'OAuth provider is not configured.' });
  }
});
app.get('/local-oauth/authorize', (request, response) => {
  if (!localAuthEnabled) return response.status(404).send('not found');
  const transaction = localOAuthRequests.get(request.query.state);
  if (!transaction || transaction.createdAt + 600_000 < Date.now()) return response.status(400).send('Lokale OAuth-Anfrage abgelaufen.');
  response.type('html').send(`<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Lokaler OAuth-Zugang · Tennisrunde</title><link rel="stylesheet" href="/app/src/styles.css"><link rel="stylesheet" href="/app/src/linotype-utility.css"></head><body class="app-mode"><header class="topbar"><div class="brand"><span class="tennisball-logo" role="img" aria-label="Tennisball"></span></div><div class="top-actions"><span class="connection">LOKALER OAUTH-ANBIETER</span></div></header><main><section class="auth-gate" aria-labelledby="local-oauth-title"><div class="auth-gate-card"><p class="kicker">OAUTH-AUTORISIERUNG</p><h1 id="local-oauth-title">Tennisrunde</h1><p>Die lokale Testidentität <strong>${escapeHTML(localAuthEmail)}</strong> möchte auf den Tennis-Spielplan zugreifen.</p><form method="post" action="/local-oauth/authorize"><input type="hidden" name="state" value="${escapeHTML(transaction.state)}"><button class="auth-gate-button" type="submit">Zugriff erlauben <span aria-hidden="true">↗</span></button></form></div></section></main></body></html>`);
});
app.post('/local-oauth/authorize', (request, response) => {
  if (!localAuthEnabled) return response.status(404).send('not found');
  const transaction = localOAuthRequests.get(request.body?.state);
  if (!transaction || transaction.createdAt + 600_000 < Date.now()) return response.status(400).send('Lokale OAuth-Anfrage abgelaufen.');
  localOAuthRequests.delete(transaction.state);
  const code = randomUUID();
  localOAuthCodes.set(code, { state: transaction.state, email: localAuthEmail, createdAt: Date.now() });
  response.redirect(303, `/auth/local/callback?${new URLSearchParams({ code, state: transaction.state }).toString()}`);
});
app.get('/auth/local/callback', (request, response) => {
  if (!localAuthEnabled) return response.status(404).send('not found');
  const authorization = localOAuthCodes.get(request.query.code);
  if (!authorization || authorization.state !== request.query.state || authorization.createdAt + 60_000 < Date.now()) return response.status(401).send('Lokaler OAuth-Callback abgelehnt.');
  localOAuthCodes.delete(request.query.code);
  const sessionToken = createLocalOAuthSession({ email: authorization.email });
  response.setHeader('Set-Cookie', oauthSessionCookie(sessionToken, { production: false }));
  response.redirect(303, '/app/');
});
const oauthCallback = async (request, response) => {
  try {
    const result = await completeOAuth(request.params.provider, request.method === 'POST' ? request.body : request.query);
    response.setHeader('Set-Cookie', oauthSessionCookie(result.sessionToken));
    if (result.context) {
      return response.type('html').send(consentHTML(beginOAuthConsent(result.identity, result.context, process.env)));
    }
    response.redirect(302, '/app/');
  } catch (error) {
    response.status(401).json({ ok: false, error: 'OAuth callback rejected.' });
  }
};
app.get('/auth/:provider/callback', oauthCallback);
app.post('/auth/:provider/callback', oauthCallback);
app.post('/oauth/consent', (request, response) => {
  try {
    if (request.body?.decision !== 'approve') return response.status(403).send('OAuth-Zugriff abgelehnt.');
    const session = readOAuthSession(cookies(request).tennis_oauth_session);
    if (!session) return response.status(401).send('OAuth-Sitzung abgelaufen.');
    const result = approveOAuthConsent(request.body.consent_token, session, process.env);
    return response.redirect(302, `${result.context.redirectUri}?${new URLSearchParams({ code: result.code, state: result.context.state })}`);
  } catch { response.status(403).send('OAuth-Zugriff abgelehnt.'); }
});
app.get('/auth/session', (request, response) => {
  const session = readOAuthSession(cookies(request).tennis_oauth_session);
  const role = roleForIdentity(session, process.env);
  const admitted = Boolean(session && role);
  response.json({ authenticated: admitted, provider: admitted ? session.provider : null, role: admitted ? role : null, playerId: admitted && role === 'player' ? playerIdForIdentity(session, process.env) : null, dataAccess: admitted, reason: admitted ? `${role} session admitted` : 'login required or identity not admitted' });
});
app.post('/auth/logout', (request, response) => {
  revokeOAuthSession(cookies(request).tennis_oauth_session);
  response.setHeader('Set-Cookie', oauthSessionCookie('', { maxAge: 0 }));
  response.status(204).end();
});
app.get(['/app', '/app/'], (request, response, next) => {
  if (!localAuthEnabled) return next();
  const session = readOAuthSession(cookies(request).tennis_oauth_session);
  if (!session || !roleForIdentity(session, process.env)) return response.redirect(303, '/auth/login');
  next();
});
app.get(['/app', '/app/'], (request, response) => response.sendFile(resolve(staticRoot, 'app.html')));
app.get('/healthz', (request, response) => response.json({ ok: true, service: 'fountain-coach-tennis' }));
app.get('/api/state', apiLimiter, async (request, response) => {
  const identity = authorized(request);
  if (!identity) return response.status(401).set('WWW-Authenticate', `Bearer resource_metadata="${publicBaseUrl(request)}/.well-known/oauth-protected-resource/mcp", scope="tennis.read tennis.write"`).json({ error: 'Bearer authentication required.' });
  const model = nativeBridgeUrl ? await nativeModel() : readModel(await authority.load());
  response.json(identity.role === 'player' ? playerReadModel(model, identity.playerId) : model);
});
app.post('/api/operation', apiLimiter, async (request, response) => {
  if (!authorized(request, true)) return response.status(401).set('WWW-Authenticate', `Bearer resource_metadata="${publicBaseUrl(request)}/.well-known/oauth-protected-resource/mcp", scope="tennis.read tennis.write"`).json({ error: 'Bearer authentication required.' });
  const { operation, input } = request.body || {};
  if (typeof operation !== 'string' || !input || typeof input !== 'object' || Array.isArray(input)) {
    return response.status(400).json({ error: 'operation and object input are required.' });
  }
  if (input.confirm !== true) {
    await recordAudit(`api:${operation}`, false);
    return response.status(403).json({ ok: false, message: 'Diese Änderung benötigt eine ausdrückliche Nutzerbestätigung (confirm: true).' });
  }
  const result = nativeBridgeUrl
    ? { ok: true, model: readModel(JSON.parse((await callNative('fountainstore/tennis.schedule.mutate', nativeOperation[operation], input)).stateJSON || JSON.stringify(input.state || emptyState()))) }
    : await authority.apply(operation, input);
  await recordAudit(`api:${operation}`, result.ok);
  response.status(result.ok ? 200 : 422).json(result);
});
// The staging server owns both the public package root and the deployed-style
// /app/ route so browser navigation and same-origin auth/API calls share one
// runtime. Production edge routing remains outside this local-only mount.
app.use('/app', express.static(staticRoot, { index: 'index.html', dotfiles: 'allow' }));
app.use(express.static(publicRoot, { index: 'index.html', dotfiles: 'allow' }));

app.all('/mcp', mcpLimiter, async (request, response) => {
  if (!authorized(request, request.method !== 'GET')) return response.status(401).set('WWW-Authenticate', `Bearer resource_metadata="${publicBaseUrl(request)}/.well-known/oauth-protected-resource/mcp", scope="tennis.read tennis.write"`).json({ error: 'Bearer authentication required.' });
  const sessionId = request.headers['mcp-session-id'];
  let transport = sessionId ? transports.get(sessionId) : null;
  if (!transport && request.method === 'POST' && isInitializeRequest(request.body)) {
    transport = new StreamableHTTPServerTransport({ sessionIdGenerator: () => randomUUID(), onsessioninitialized: id => transports.set(id, transport) });
    transport.onclose = () => { if (transport.sessionId) transports.delete(transport.sessionId); };
    await createServer().connect(transport);
  }
  if (!transport) return response.status(400).json({ jsonrpc: '2.0', error: { code: -32000, message: 'No valid MCP session.' }, id: null });
  await transport.handleRequest(request, response, request.body);
});

app.listen(port, '0.0.0.0', () => console.log(`Fountain Coach Tennis + MCP listening on http://127.0.0.1:${port}/`));

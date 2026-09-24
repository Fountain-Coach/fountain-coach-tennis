import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { createOAuthCollection } from './oauth-store.mjs';

const providers = Object.freeze({
  google: Object.freeze({
    authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenEndpoint: 'https://oauth2.googleapis.com/token',
    userInfoEndpoint: 'https://openidconnect.googleapis.com/v1/userinfo',
    issuer: 'https://accounts.google.com',
    jwksUri: 'https://www.googleapis.com/oauth2/v3/certs',
    scopes: ['openid', 'email', 'profile']
  }),
  apple: Object.freeze({
    authorizationEndpoint: 'https://appleid.apple.com/auth/authorize',
    tokenEndpoint: 'https://appleid.apple.com/auth/token',
    userInfoEndpoint: null,
    issuer: 'https://appleid.apple.com',
    jwksUri: 'https://appleid.apple.com/auth/keys',
    scopes: ['openid', 'email', 'name']
  }),
  github: Object.freeze({
    authorizationEndpoint: 'https://github.com/login/oauth/authorize',
    tokenEndpoint: 'https://github.com/login/oauth/access_token',
    userInfoEndpoint: 'https://api.github.com/user',
    userEmailsEndpoint: 'https://api.github.com/user/emails',
    issuer: 'https://github.com',
    scopes: ['read:user', 'user:email', 'offline_access']
  })
});

const providerEnv = Object.freeze({
  google: Object.freeze({ clientId: 'GOOGLE_OAUTH_CLIENT_ID', clientSecret: 'GOOGLE_OAUTH_CLIENT_SECRET', redirectUri: 'GOOGLE_OAUTH_REDIRECT_URI' }),
  apple: Object.freeze({ clientId: 'APPLE_OAUTH_CLIENT_ID', clientSecret: 'APPLE_OAUTH_CLIENT_SECRET', redirectUri: 'APPLE_OAUTH_REDIRECT_URI' }),
  github: Object.freeze({ clientId: 'GITHUB_OAUTH_CLIENT_ID', clientSecret: 'GITHUB_OAUTH_CLIENT_SECRET', redirectUri: 'GITHUB_OAUTH_REDIRECT_URI' })
});

const pendingChallenges = createOAuthCollection('pending_challenges');
const sessions = createOAuthCollection('sessions');
const clients = createOAuthCollection('clients');
const authorizationCodes = createOAuthCollection('authorization_codes');
const accessTokens = createOAuthCollection('access_tokens');
const refreshTokens = createOAuthCollection('refresh_tokens');
const consentRequests = createOAuthCollection('consent_requests');
const challengeLifetimeMs = 10 * 60 * 1000;
const sessionLifetimeMs = 8 * 60 * 60 * 1000;
const authorizationCodeLifetimeMs = 60 * 1000;
const accessTokenLifetimeMs = 60 * 60 * 1000;
const refreshTokenLifetimeMs = 30 * 24 * 60 * 60 * 1000;

const base64Url = value => Buffer.from(value).toString('base64url');

export function configuredProviders(env = process.env) {
  return Object.fromEntries(Object.entries(providerEnv).filter(([, keys]) => keys.clientId in env && keys.clientSecret in env && keys.redirectUri in env).map(([name, keys]) => [name, {
    ...providers[name],
    clientId: env[keys.clientId],
    clientSecret: env[keys.clientSecret],
    redirectUri: env[keys.redirectUri]
  }]));
}

export function requireOAuthProvider(name, env = process.env) {
  if (!providers[name]) throw new Error('Unsupported OAuth provider.');
  const provider = configuredProviders(env)[name];
  if (!provider || Object.values(providerEnv[name]).some(key => !String(env[key] || '').trim())) {
    throw new Error(`OAuth provider ${name} is not configured.`);
  }
  return provider;
}

export function createOAuthChallenge() {
  const state = base64Url(randomBytes(32));
  const nonce = base64Url(randomBytes(32));
  const codeVerifier = base64Url(randomBytes(48));
  const codeChallenge = base64Url(createHash('sha256').update(codeVerifier).digest());
  return Object.freeze({ state, nonce, codeVerifier, codeChallenge });
}

export function buildAuthorizationUrl(name, challenge, env = process.env) {
  const provider = requireOAuthProvider(name, env);
  for (const key of ['state', 'nonce', 'codeVerifier', 'codeChallenge']) {
    if (!challenge?.[key]) throw new Error(`OAuth challenge is missing ${key}.`);
  }
  const url = new URL(provider.authorizationEndpoint);
  url.search = new URLSearchParams({
    client_id: provider.clientId,
    redirect_uri: provider.redirectUri,
    response_type: 'code',
    scope: provider.scopes.join(' '),
    state: challenge.state,
    nonce: challenge.nonce,
    code_challenge: challenge.codeChallenge,
    code_challenge_method: 'S256',
    ...(name === 'apple' ? { response_mode: 'form_post' } : {})
  });
  return url.toString();
}

export function beginOAuth(name, env = process.env) {
  return beginOAuthWithContext(name, undefined, env);
}

export function beginOAuthWithContext(name, context, env = process.env) {
  const challenge = createOAuthChallenge();
  pendingChallenges.set(challenge.state, { name, challenge, context, expiresAt: Date.now() + challengeLifetimeMs });
  return Object.freeze({ provider: name, state: challenge.state, authorizationUrl: buildAuthorizationUrl(name, challenge, env) });
}

export async function exchangeAndVerify(name, { code, codeVerifier, state, expectedState, nonce }, env = process.env, fetchImpl = fetch) {
  const provider = requireOAuthProvider(name, env);
  if (!code || !codeVerifier || !nonce || !sameSecret(state, expectedState)) throw new Error('OAuth callback rejected.');
  const tokenResponse = await fetchImpl(provider.tokenEndpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: provider.clientId,
      client_secret: provider.clientSecret,
      redirect_uri: provider.redirectUri,
      code_verifier: codeVerifier
    })
  });
  if (!tokenResponse.ok) throw new Error('OAuth token exchange rejected by provider.');
  const token = await tokenResponse.json();
  if (name === 'github') {
    if (typeof token.access_token !== 'string' || !token.access_token) throw new Error('GitHub returned no access token.');
    const headers = {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${token.access_token}`,
      'x-github-api-version': '2022-11-28'
    };
    const userResponse = await fetchImpl(provider.userInfoEndpoint, { headers });
    if (!userResponse.ok) throw new Error('GitHub identity lookup rejected.');
    const user = await userResponse.json();
    if (!Number.isInteger(user.id) || user.id <= 0) throw new Error('GitHub identity has no stable subject.');
    const emailResponse = await fetchImpl(provider.userEmailsEndpoint, { headers });
    if (!emailResponse.ok) throw new Error('GitHub email lookup rejected.');
    const emails = await emailResponse.json();
    const email = Array.isArray(emails)
      ? emails.find(entry => entry?.primary === true && entry?.verified === true)?.email
        || emails.find(entry => entry?.verified === true)?.email
      : null;
    if (typeof email !== 'string' || !email) throw new Error('GitHub returned no verified email.');
    return Object.freeze({ provider: name, subject: String(user.id), email: email.toLowerCase() });
  }
  if (!token.id_token || typeof token.id_token !== 'string') throw new Error('OAuth provider returned no ID token.');
  const verified = await jwtVerify(token.id_token, createRemoteJWKSet(new URL(provider.jwksUri)), {
    issuer: provider.issuer,
    audience: provider.clientId,
    nonce
  });
  if (typeof verified.payload.sub !== 'string' || !verified.payload.sub) throw new Error('OAuth ID token has no subject.');
  return Object.freeze({ provider: name, subject: verified.payload.sub, email: typeof verified.payload.email === 'string' ? verified.payload.email : null });
}

export async function completeOAuth(name, params, env = process.env, fetchImpl = fetch) {
  const pending = pendingChallenges.get(params?.state);
  if (!pending || pending.name !== name || pending.expiresAt <= Date.now()) {
    pendingChallenges.delete(params?.state);
    throw new Error('OAuth callback state is unknown or expired.');
  }
  pendingChallenges.delete(params.state);
  const identity = await exchangeAndVerify(name, { ...params, codeVerifier: pending.challenge.codeVerifier, expectedState: pending.challenge.state, nonce: pending.challenge.nonce }, env, fetchImpl);
  const sessionToken = base64Url(randomBytes(32));
  sessions.set(sessionToken, { ...identity, expiresAt: Date.now() + sessionLifetimeMs });
  return Object.freeze({ sessionToken, identity, context: pending.context });
}

export function readOAuthSession(sessionToken) {
  if (!sessionToken) return null;
  const session = sessions.get(sessionToken);
  if (!session || session.expiresAt <= Date.now()) {
    sessions.delete(sessionToken);
    return null;
  }
  return Object.freeze({ provider: session.provider, subject: session.subject, email: session.email, expiresAt: session.expiresAt });
}

// Local staging only. Production authentication always comes from a configured
// external OAuth provider; this seam exists so the browser contract can be
// exercised without external credentials.
export function createLocalOAuthSession({ email = 'local-admin@example.test' } = {}) {
  const sessionToken = base64Url(randomBytes(32));
  sessions.set(sessionToken, {
    provider: 'local',
    subject: 'local-admin',
    email: String(email).toLowerCase(),
    expiresAt: Date.now() + sessionLifetimeMs
  });
  return sessionToken;
}

export function revokeOAuthSession(sessionToken) {
  if (sessionToken) sessions.delete(sessionToken);
}

export function oauthSessionCookie(sessionToken, { production = process.env.NODE_ENV === 'production', maxAge = sessionLifetimeMs / 1000 } = {}) {
  return [
    `tennis_oauth_session=${encodeURIComponent(sessionToken || '')}`,
    'HttpOnly',
    'SameSite=Lax',
    'Path=/',
    `Max-Age=${Math.max(0, Math.floor(maxAge))}`,
    ...(production ? ['Secure'] : [])
  ].join('; ');
}

export function sameSecret(expected, received) {
  if (typeof expected !== 'string' || typeof received !== 'string' || expected.length !== received.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(received));
}

function configuredAdminEmails(env = process.env) {
  return new Set(String(env.TENNIS_ADMIN_EMAILS || env.OAUTH_ADMIN_EMAILS || '').split(',').map(value => value.trim().toLowerCase()).filter(Boolean));
}

export function isAdminIdentity(identity, env = process.env) {
  const emails = configuredAdminEmails(env);
  return Boolean(identity?.email && emails.has(identity.email.toLowerCase()));
}

export function configuredProviderName(env = process.env) {
  const name = String(env.OAUTH_IDP || 'google');
  requireOAuthProvider(name, env);
  return name;
}

function validRedirectURI(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || (url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname));
  } catch { return false; }
}

export function registerOAuthClient({ redirectUris, clientName } = {}) {
  if (!Array.isArray(redirectUris) || !redirectUris.length || redirectUris.some(uri => typeof uri !== 'string' || !validRedirectURI(uri))) {
    throw new Error('OAuth client redirect_uris must contain HTTPS URLs (or local development URLs).');
  }
  const clientId = `tennis-client-${base64Url(randomBytes(18))}`;
  clients.set(clientId, { clientId, clientName: String(clientName || 'ChatGPT'), redirectUris: [...new Set(redirectUris)] });
  return Object.freeze({ client_id: clientId, client_name: String(clientName || 'ChatGPT'), redirect_uris: [...new Set(redirectUris)], token_endpoint_auth_method: 'none', grant_types: ['authorization_code', 'refresh_token'], response_types: ['code'] });
}

export function authorizeOAuthRequest({ clientId, redirectUri, state, codeChallenge, codeChallengeMethod = 'S256', scope = 'openid offline_access' } = {}, env = process.env) {
  const client = clients.get(clientId);
  if (!client || !client.redirectUris.includes(redirectUri) || !state || !codeChallenge || codeChallengeMethod !== 'S256') throw new Error('OAuth authorization request rejected.');
  const allowedScopes = new Set(['openid', 'offline_access', 'tennis.read', 'tennis.write']);
  const requestedScopes = String(scope || 'openid offline_access').split(/\s+/).filter(Boolean);
  if (requestedScopes.some(value => !allowedScopes.has(value))) throw new Error('OAuth scope request rejected.');
  const provider = String(env.OAUTH_IDP || 'google');
  requireOAuthProvider(provider, env);
  return beginOAuthWithContext(provider, { clientId, redirectUri, state, codeChallenge, scope: requestedScopes.join(' ') }, env);
}

export function completeOAuthAuthorization(identity, context, env = process.env) {
  if (!context || !isAdminIdentity(identity, env)) throw new Error('OAuth identity is not an admitted Tennis admin.');
  const code = base64Url(randomBytes(32));
  authorizationCodes.set(code, { ...context, identity, expiresAt: Date.now() + authorizationCodeLifetimeMs });
  return code;
}

export function beginOAuthConsent(identity, context, env = process.env) {
  if (!context || !isAdminIdentity(identity, env)) throw new Error('OAuth identity is not an admitted Tennis admin.');
  const consentToken = base64Url(randomBytes(32));
  consentRequests.set(consentToken, { identity, context, expiresAt: Date.now() + authorizationCodeLifetimeMs });
  return consentToken;
}

export function approveOAuthConsent(consentToken, identity, env = process.env) {
  const request = consentRequests.get(consentToken);
  consentRequests.delete(consentToken);
  if (!request || request.expiresAt <= Date.now() || request.identity.subject !== identity?.subject || !isAdminIdentity(identity, env)) throw new Error('OAuth consent rejected.');
  return Object.freeze({ code: completeOAuthAuthorization(identity, request.context, env), context: request.context });
}

export function exchangeAuthorizationCode({ code, clientId, redirectUri, codeVerifier } = {}) {
  const grant = authorizationCodes.get(code);
  authorizationCodes.delete(code);
  if (!grant || grant.expiresAt <= Date.now() || grant.clientId !== clientId || grant.redirectUri !== redirectUri || !codeVerifier) throw new Error('OAuth authorization code rejected.');
  const verifierChallenge = base64Url(createHash('sha256').update(codeVerifier).digest());
  if (!sameSecret(verifierChallenge, grant.codeChallenge)) throw new Error('OAuth PKCE verification failed.');
  const accessToken = base64Url(randomBytes(32));
  const refreshToken = base64Url(randomBytes(40));
  const expiresAt = Date.now() + accessTokenLifetimeMs;
  accessTokens.set(accessToken, { identity: grant.identity, clientId, scope: grant.scope, expiresAt });
  refreshTokens.set(refreshToken, { identity: grant.identity, clientId, scope: grant.scope, expiresAt: Date.now() + refreshTokenLifetimeMs });
  return { access_token: accessToken, token_type: 'Bearer', expires_in: Math.floor(accessTokenLifetimeMs / 1000), refresh_token: refreshToken, scope: grant.scope };
}

export function refreshOAuthToken({ refreshToken, clientId } = {}) {
  const grant = refreshTokens.get(refreshToken);
  if (!grant || grant.expiresAt <= Date.now() || grant.clientId !== clientId) throw new Error('OAuth refresh token rejected.');
  const accessToken = base64Url(randomBytes(32));
  accessTokens.set(accessToken, { identity: grant.identity, clientId, scope: grant.scope, expiresAt: Date.now() + accessTokenLifetimeMs });
  return { access_token: accessToken, token_type: 'Bearer', expires_in: Math.floor(accessTokenLifetimeMs / 1000), scope: grant.scope };
}

export function readOAuthAccessToken(token) {
  const grant = accessTokens.get(token);
  if (!grant || grant.expiresAt <= Date.now()) { if (token) accessTokens.delete(token); return null; }
  return Object.freeze({ ...grant.identity, scope: grant.scope, expiresAt: grant.expiresAt });
}

export function oauthMetadata(baseUrl) {
  const issuer = String(baseUrl).replace(/\/$/, '');
  return { issuer, authorization_endpoint: `${issuer}/oauth/authorize`, token_endpoint: `${issuer}/oauth/token`, registration_endpoint: `${issuer}/oauth/register`, response_types_supported: ['code'], grant_types_supported: ['authorization_code', 'refresh_token'], code_challenge_methods_supported: ['S256'], token_endpoint_auth_methods_supported: ['none'], scopes_supported: ['openid', 'offline_access', 'tennis.read', 'tennis.write'] };
}

export function protectedResourceMetadata(baseUrl) {
  const issuer = String(baseUrl).replace(/\/$/, '');
  return { resource: `${issuer}/mcp`, authorization_servers: [issuer], scopes_supported: ['openid', 'offline_access', 'tennis.read', 'tennis.write'], bearer_methods_supported: ['header'] };
}

export { providers };

# Security and compliance boundary

This app is not a legal opinion and cannot be declared legally compliant by code alone. Player names and
availability dates are personal data in many jurisdictions. Before public operation, the owner must provide a privacy
notice, define the controller/processor roles, retention/deletion rules, user rights and incident contact, and obtain
the required legal review for the target jurisdiction.

## Required production configuration

- Serve the app and `/mcp` only over HTTPS behind a maintained reverse proxy.
- Set `NODE_ENV=production`, a public HTTPS `OAUTH_ISSUER`, one configured OIDC provider, and a comma-separated
  `TENNIS_ADMIN_EMAILS` allowlist; GitHub, Google, and Apple are supported provider seams; never commit provider
  secrets or put them in browser code.
- The MCP OAuth surface uses authorization-code + PKCE, dynamic client registration, explicit consent, `tennis.read`
  and `tennis.write` scopes, and refresh tokens. The static `MCP_BEARER_TOKEN` is an owner-only compatibility lane.
- OAuth client, grant, and session records are currently process-local. Production rollout must move these records and
  token-signing/revocation custody into the existing SecretStore/FountainStore host adapter before claiming restart-safe
  continuity or multi-user operation.
- Set `TENNIS_STATE_FILE` outside the web root on a private volume with backups and restricted file permissions.
- Set `CORS_ORIGINS` to an explicit allowlist; do not use `*`.
- Configure ChatGPT/OpenAI approval as `always` for all write tools and keep the server-side `confirm: true` gate.
- Minimize logs: record operational metadata only, never player payloads or bearer tokens; define retention and deletion.
- The built-in audit log records timestamp, operation and success only; rotate and delete it under a documented retention policy.

## Abuse controls implemented

The server fails closed in production without authentication, compares bearer credentials in constant time, limits
request body size, rate-limits API/MCP traffic, sets baseline security headers, exposes only typed allow-listed tools,
rejects invalid schedule mutations, requires explicit confirmation for every write, and performs atomic state-file
writes. These controls reduce misuse; they do not replace monitoring, patching, backups, account lifecycle controls,
or a security review. The in-process rate limiter is a single-instance baseline; horizontally scaled production needs
a shared limiter at the reverse proxy or a reviewed external store.

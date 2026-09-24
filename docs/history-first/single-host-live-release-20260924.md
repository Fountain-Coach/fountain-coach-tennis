# History-first reconstruction — single-host live release housekeeping

Date: 2026-09-24

## Requested outcome

Use the provisioned `vinegarium` host as the direct live development and production environment for the
owner-controlled intranet app. Keep `tennis.fountain.coach` as the canonical publishing domain and do not require a
second always-on staging server.

## Existing authority and evidence

`ENVIRONMENT.md` defines one dedicated HCloud host, Caddy as the public edge, a private Tennis listener, and
server-authoritative SQLite. The provisioning record confirms `vinegarium` is running Ubuntu 24.04 and accepts the
injected administrator key. The LAN Docker release is already a working staging witness, but is not production.

## Decision

Skipping mandatory staging is acceptable for this private intranet scope. “Hot deploy” means an atomic versioned
release with health/read-back and rollback, not editing or replacing the active directory in place.

## Smallest missing seam

The repository needs a typed live-release adapter for `vinegarium` that reuses the existing deployer boundary and adds
versioned release activation, private listener validation, Caddy switch/read-back, SQLite backup gating, retention, and
rollback. DNS/TLS, GitHub OAuth, and ChatGPT/MCP remain separate witnesses.

## Finite proof

One release must produce a clean source revision, exact host/domain receipt, private service health, Caddy/TLS proof,
matching public digest, pre-change backup where applicable, retained rollback target, and successful rollback readiness.

Observed: single-host topology and provisioned host. Inferred: no permanent staging host is needed for this intranet
scope. Unestablished: live release adapter, Caddy/TLS, application deployment, backups, rollback, OAuth, and MCP.

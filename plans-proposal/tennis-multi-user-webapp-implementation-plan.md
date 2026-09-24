# Tennis multi-user web application — reviewed implementation plan

This is the implementation proposal derived from the attached prompt. The attached prompt is preserved verbatim in
[tennis-multi-user-webapp-implementation-prompt.txt](tennis-multi-user-webapp-implementation-prompt.txt). This
document revises it only to make sequencing, ownership, evidence, and current-repository boundaries explicit.

## Current baseline

Observed in the initial public snapshot:

- the browser application and estate landing projection are present under `app/` and `estate-landing/`;
- schedule generation, validation, fairness, absence rules, tabs, exports, OAuth seams, and MCP contracts have focused
  tests;
- browser `localStorage` remains the current application persistence;
- the repository contains no server-authoritative database, durable multi-user session store, admin surface, or
  completed GitHub/ChatGPT/MCP production connection.

The PDF is therefore a target specification, not a completion certificate.

## Revised architecture

Preserve the existing frontend template and terminology. Add a same-repository authenticated application service:

```
Browser UI
  -> authenticated application API
  -> application service and authorization policy
  -> server-authoritative SQLite
```

GitHub OAuth provides stable identity using the numeric GitHub user ID. The application owns roles, authorization,
tennis data, audit metadata, and session policy. MCP remains an optional adapter over the authenticated application
surface; it is not a second data authority.

This repository is currently Node/ESM. The first backend slice should use the existing Node runtime and package
boundary unless an implementation decision, recorded in `PLANS.md`, proves a different runtime is required.

## Ordered implementation slices

### 0. Baseline inventory

Inventory every current screen, route, entity, field, relationship, form, action, filter, sort, calculation,
validation rule, export, local/session/IndexedDB access, and derived state. Reconcile the result with the existing
implementation map and tests. Do not add PDF example entities such as teams, clubs, seasons, or competitions unless
the inventory establishes them.

Evidence: checked-in inventory, current-to-target mapping, and a passing baseline test report.

### 1. Server authority and SQLite

Define only inventoried persistent entities with stable UUIDs, audit metadata, foreign keys, constraints,
transactions, and WAL. Add migrations and deterministic fixtures. Keep application rules in a service boundary that
can be tested without a browser.

Evidence: schema/migration tests, transaction and referential-integrity tests, and no browser-only write path in the
server-backed mode.

### 2. Identity, sessions, and roles

Implement GitHub OAuth with state, PKCE where applicable, secure HttpOnly/SameSite cookies, production Secure cookies,
bounded session expiry, and no secret/token logging. Store only the stable GitHub numeric ID plus the minimum profile
data needed by the application. Define backend-enforced `admin`, `editor`, and `user` policies; UI visibility is
not authorization.

Evidence: OAuth callback/state/session tests, authentication failure tests, role matrix tests, and secret-scan proof.

### 3. Authenticated API and CRUD

Expose authenticated CRUD for every inventoried persistent entity. Validate at the API boundary, enforce ownership and
role policy in the service, preserve referential integrity, record audit metadata, and handle concurrent updates
deterministically. Add search, filtering, and sorting without moving authority back into the browser.

Evidence: CRUD/authz/concurrency tests for each entity and API contract tests.

### 4. Legacy migration

Provide a user-initiated local-storage migration with validation, preview, explicit confirmation, transactional
commit, an idempotency marker, and an error report. Never silently delete browser data. Preserve rejected input for
user recovery or make its disposition explicit.

Evidence: valid, invalid, partial, repeated, and rollback migration tests; user-visible preview and completion state.

### 5. Administration, export, backup, and restore

Add the `/admin` surface only after the role policy exists. Implement user/role administration, JSON export, backup,
restore, integrity checks, and bounded operational commands. Keep backups out of the public repository and logs.

Evidence: admin authorization tests, export/import round trips, restore/integrity tests, and redacted operational
evidence.

### 6. Frontend cutover and parity

Retain current workflows, terminology, calculations, rules, filters, and export behavior. Replace authoritative
local-storage reads/writes with authenticated API calls, using local state only for transient UI state or an explicitly
bounded migration buffer. Add loading, conflict, expired-session, validation, and failure states to the accessible UI.

Evidence: browser CRUD/authentication/migration tests, accessibility checks, current-feature parity checks, and
multi-user isolation tests.

### 7. Deployment and live acceptance

Document independent deployment, environment variables, database lifecycle, backup policy, OAuth callback configuration,
health checks, logs without secrets, and rollback. Verify public HTTPS, authentication, role enforcement, persistence,
and the optional MCP/ChatGPT connection separately. Do not report production readiness until every PDF DoD item has
matching evidence.

Evidence: deployment checklist, health/read-back evidence, rollback evidence, and a dated acceptance record.

## Non-negotiable privacy and FCIS gates

- No participant names, absence dates, private runtime files, session values, OAuth secrets, tokens, or deployment
  credentials enter the public repository.
- Backend authorization is the security boundary; hidden controls and route obscurity are not authorization.
- The verbatim PDF source remains distinguishable from this reviewed plan.
- Every implementation slice has a focused proof gate and a semantic commit pushed to `main`.
- A generated plan, skill, or status file never substitutes for executed tests or live acceptance.

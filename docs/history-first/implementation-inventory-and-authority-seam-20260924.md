# History-first reconstruction: implementation inventory and authority seam

## Capability and requested outcome

Execute the next bounded change from PLANS.md: check in the current feature/persistence inventory and repair the
smallest server-authoritative domain seam without changing the user-facing frontend.

## Current authority and execution path

- Browser presentation and local fallback: app/src/tennis.js.
- Pure schedule domain rules: app/src/tennis-core.js.
- Current server/API/MCP authority: app/integration/tennis-service.mjs plus app/mcp-server.mjs.
- Current persistence adapter: atomic JSON file selected by TENNIS_STATE_FILE; production SQLite is not yet present.
- Optional native boundary: the existing TENNIS_NATIVE_BRIDGE_URL path in mcp-server.mjs.

## Existing working components and proof

The initial public snapshot established schedule generation/validation, browser UI workflows, OAuth/MCP seams, and
authenticated API/MCP contract tests. The remote-browser contract proves that an authenticated server operation
persists a generated schedule and can be read back through the API.

## Failure evidence

The browser persists players, schedule, and configuration in three localStorage keys. The server JSON state only
preserved players, schedule, and generatedAt; configuration was omitted from emptyState, normalization, read-model
output, and mutation handling. The frontend already advertises update_configuration in remote mode, but the local
server operation rejected it as unknown. This is a current feature-parity defect, not a reason to invent unobserved
entities or jump directly to a guessed SQLite schema.

## Smallest missing seam

Make the existing server-owned state model carry the observed configuration entity, validate it at the service
boundary, and expose a focused test. Keep the JSON adapter explicitly transitional; SQLite, durable auth, roles,
migration, and frontend cutover remain later slices.

## Reuse decision

Reuse the current Node/ESM service, atomic file adapter, pure schedule rules, API/MCP routes, and existing tests.
Do not add a parallel server, generic database wrapper, new transport, or new domain entities.

## Finite acceptance proof

1. The feature/persistence inventory is checked in as Markdown and JSON.
2. The server model preserves configuration across load, update, generate, and read-back.
3. Invalid configuration is rejected without persistence.
4. Existing core, MCP, remote-authority, and syntax tests pass.
5. Privacy scan and git diff --check pass, then a semantic commit is pushed to main.

## Claim classification

Observed: current UI fields, localStorage keys, service operations, API/MCP contracts, and JSON persistence.
Implemented by this slice: configuration parity in the existing server authority. Unestablished: SQLite authority,
durable sessions, role administration, migration, WebKit acceptance, HCloud provisioning, and production deployment.

## Stop condition

Stop after inventory and configuration authority parity are proven. The next slice may introduce a normalized SQLite
adapter only after the checked-in inventory and migration design are reviewed.

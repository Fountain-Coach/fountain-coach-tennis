# History-first reconstruction — normalized SQLite authority seam

Date: 2026-09-24

## Current authority and execution path

The checked-in application owns domain rules in `app/src/tennis-core.js`, state mutations in
`app/integration/tennis-service.mjs`, and authenticated API/MCP routing in `app/mcp-server.mjs`. Before this slice,
the service loaded and atomically replaced one JSON state file selected by `TENNIS_STATE_FILE`; the browser also kept
localStorage copies for its current static/single-browser behavior.

## What previously worked

The service already normalized configuration, validated full schedules, and exposed one mutation boundary used by
both API and MCP. Existing unit, MCP, and remote API contracts passed, including configuration persistence.

## What was missing

The HCloud environment contract named server-authoritative SQLite, but no SQLite schema, migration version, or
runtime selection seam existed. Replacing the service directly would have duplicated mutation logic and risked
behavior drift.

## Smallest seam implemented

The pure `applyStateOperation` boundary is reused by a normalized SQLite adapter. Migration 1 records the observed
players, unavailability, availability rules, schedule days, matches, configuration, and generated-at state. Foreign
keys, WAL mode, transactional writes, idempotent migration, and an explicit `TENNIS_STATE_BACKEND=sqlite` selector
were added. JSON remains the default transition backend. No PDF-only example entity was introduced, and frontend
localStorage remains unchanged for the next browser authority-cutover slice.

## Follow-on browser cutover seam

The browser already fetched `/api/state` after an admitted session, but its write helper still constructed an obsolete
native-bridge-shaped payload and localStorage remained the implicit fallback. The cutover uses the existing direct
API contract, stops local writes after remote admission, and adds one explicit confirmed import operation for a local
snapshot. Automatic merge or deletion is intentionally not introduced.

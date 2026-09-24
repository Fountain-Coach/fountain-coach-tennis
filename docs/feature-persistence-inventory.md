# Current Tennis feature and persistence inventory

This inventory records observed current behavior before schema or API expansion. The machine-readable companion is
[app/scenarios/tennis-feature-inventory.json](../app/scenarios/tennis-feature-inventory.json).

## Routes and screens

| Route/state | Surface | Observed behavior |
| --- | --- | --- |
| / | Landing/Pong | Isometric Pong stage, sound control, landing presentation, link into planning mode |
| /?app=1, /app, /app/ | Authenticated application shell | Auth gate, session check, shared-state load, schedule/players/analysis UI |
| app / Spielplan | Schedule | Date/player filters, generated match cards, match editing, validation, absence and rest display |
| app / Spieler | Player/configuration management | Add player, name and active state, fixed first/last slot, absences, availability rules, season rules |
| app / Auswertung | Analysis | Games, rest days, pair counts, fairness delta, absences, validation |
| app / export | Excel export | Client-side XLSX-compatible export of schedule, player totals, and pairs |
| /auth/*, /oauth/* | Identity/integration | GitHub/Google/Apple OAuth seams, local development OAuth, MCP authorization-code + PKCE |
| /api/state, /api/operation, /mcp | Server integration | Authenticated read/write API and MCP tools; writes require explicit confirmation |

## Observed domain entities

### Player

Fields: id, name, active, fixedFirst, fixedLast, unavailable[], and optional availabilityRules[] with id, kind,
startDate, endDate, weekdays[], and note.

### Schedule

schedule[] contains days with date and matches[]. Each match contains time, a, and b, where a and b are player IDs
or null.

### Configuration

Fields: seasonStart, seasonEnd, weekdays[], times[], matchDurationMinutes, and matchesPerDay. Configuration is now
preserved by the server authority and validated before mutation.

### Derived read model

The service derives analysis, absences, validation, and generatedAt. These are projections, not independent
authoritative entities.

## Current persistence map

| Surface | Current persistence | Current authority | Target boundary |
| --- | --- | --- | --- |
| Players | localStorage key fountain-tennis-players; server JSON or selectable SQLite players | Browser fallback or authenticated server API/MCP | SQLite `players`, `player_unavailability`, and `player_availability_rules` |
| Schedule | localStorage key fountain-tennis-schedule; server JSON or selectable SQLite schedule | Browser fallback or authenticated server API/MCP | SQLite `schedule_days` and `matches` |
| Configuration | localStorage key fountain-tennis-configuration; server JSON or selectable SQLite configuration | Browser fallback or authenticated server API/MCP | SQLite `tennis_configuration` record |
| OAuth sessions/grants | Process-local maps in integration/oauth.mjs | Current process only | Durable secure session/grant records |
| Audit events | JSONL path TENNIS_AUDIT_FILE | Server append-only file | Durable redacted audit events |
| MCP transport sessions | Process-local map in mcp-server.mjs | Current process only | Bounded durable or explicitly ephemeral transport policy |
| Export | Browser-generated download | Browser action | Authenticated export endpoint with audit/retention policy |

## Operation inventory

| Operation | Current route/tool | Persistent effect | Validation |
| --- | --- | --- | --- |
| generate_schedule | /api/operation, tennis_generate_schedule | Replaces schedule and sets generatedAt | Full schedule validation |
| reset_schedule | /api/operation, tennis_reset_schedule | Clears schedule and generatedAt | Explicit confirmation |
| add_player | /api/operation, tennis_add_player | Adds player | Non-empty name and full-plan validation |
| update_player | /api/operation, tennis_update_player | Changes name/active/fixed slots | Player existence and full-plan validation |
| update_availability | /api/operation, tennis_update_availability | Changes unavailable dates | ISO date validation and full-plan validation |
| update_fixed_time | /api/operation, tennis_update_fixed_time | Changes first/last fixed slot | Slot/type validation and full-plan validation |
| update_configuration | /api/operation; browser remote mode | Changes season rules | Configuration shape and full-plan validation |
| edit_match | /api/operation, tennis_edit_match | Changes match players | Match existence and full-plan validation |

## Gaps intentionally deferred

No guessed teams, clubs, seasons, or competitions are added: the current application inventory does not establish
them. SQLite normalization is now established for the observed domain, while UUID migration, durable OAuth/session
state, role administration, full CRUD surfaces, legacy localStorage migration, backup/restore, WebKit acceptance,
HCloud service release, and production OAuth/MCP acceptance remain later bounded changes.

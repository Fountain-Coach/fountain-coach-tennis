# Implementation map

The repository starts from the existing tennis application and follows the attached multi-user implementation prompt as a future target. The prompt is specification input, not evidence that these capabilities already exist.

| Existing surface | Current persistence | Target boundary |
| --- | --- | --- |
| Players, availability, schedule, configuration | Browser `localStorage` in `app/src/tennis.js` | Authenticated API backed by server SQLite |
| Schedule generation and validation | `app/src/tennis-core.js` | Server-side service rules with shared validation |
| Login/OAuth seam | Node integration module; process-local sessions | GitHub identity plus durable local users, roles, and sessions |
| MCP read/write tools | `app/mcp-server.mjs` | Authenticated, consented MCP adapter over the application API |
| Administration | Not yet implemented | Protected `/admin` with entity CRUD and user/role management |
| Import/export and operations | Not yet implemented | Validated legacy import, JSON export, backup, restore, integrity checks |

The first implementation slice must inventory the actual entities and browser persistence, define the normalized schema and API, and preserve the current frontend template during incremental migration. No feature may be silently dropped.

# History-first reconstruction — SQLite recovery boundary

Date: 2026-09-24

## Current authority and execution path

The server-authoritative application database is the SQLite file selected by `TENNIS_SQLITE_FILE`; its schema and
OAuth records are managed by the application integration modules. No backup or restore operation existed before this
slice, and no live HCloud service-release adapter is admitted.

## What previously worked

SQLite migration, application transactions, OAuth persistence, and API/MCP contracts were independently tested. The
environment contract already required backups, integrity checks, rollback, and enough disk headroom.

## What was missing

The requirement had no executable local boundary: there was no consistent snapshot operation, no permission check, no
retention behavior, and no safe restore path that preserved the pre-restore database.

## Smallest seam implemented

`sqlite-backup.mjs` provides absolute-path-checked `VACUUM INTO` backups, integrity verification, mode `0600`, bounded
retention, staged restore, and a rollback snapshot of the existing target. Tests prove round-trip restoration and
retention. The module deliberately does not pretend to provide encrypted off-host storage, HCloud credentials, or a
production recovery receipt; those belong to the future typed service-release operation.

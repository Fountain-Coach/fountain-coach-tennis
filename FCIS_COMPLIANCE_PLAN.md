# FCIS compliance plan

This plan tracks the evidence needed to move the public tennis snapshot toward the PDF target.

1. Inventory current behavior and persistence before schema design.
2. Introduce server-authoritative SQLite and migrations.
3. Add GitHub identity, secure sessions, and backend-enforced roles.
4. Add authenticated CRUD, validation, auditability, concurrency, search, and filtering.
5. Add previewed transactional local-storage migration.
6. Add admin, export, backup, restore, and integrity operations.
7. Cut the frontend over while preserving feature parity and accessibility.
8. Run independent deployment, HTTPS, rollback, OAuth, and optional MCP acceptance.

Each step requires focused tests, privacy scanning, a written result in `PLANS.md`, and a semantic commit pushed to
`main`. The plan does not authorize production mutation by itself.

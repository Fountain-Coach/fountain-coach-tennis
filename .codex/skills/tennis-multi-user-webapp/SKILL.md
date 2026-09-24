---
name: tennis-multi-user-webapp
description: Implement and validate the Fountain Coach Tennis multi-user migration while preserving current UI behavior and separating PDF requirements from proven capability.
---

# Tennis multi-user web application

Use this skill for architecture, backend, authentication, migration, CRUD, admin, multi-user, or deployment work in
this repository.

## Required context

Read the repository root `AGENTS.md`, `PLANS.md`, `FCIS_AUDIT.md`, and
`plans-proposal/tennis-multi-user-webapp-implementation-plan.md`. Read the verbatim PDF extraction when checking
whether a requirement is represented; do not treat it as runtime authority.

## Procedure

1. Inspect `git status`, recent history, current tests, and the actual application path before changing architecture.
2. Add or update a history-first evidence record for substantial work.
3. Inventory current behavior before adding tables, endpoints, roles, or example entities.
4. Implement one bounded slice with the existing Node/ESM application boundary unless a recorded decision proves a
   different runtime is needed.
5. Keep browser state non-authoritative once server-backed mode is introduced.
6. Enforce OAuth state/session security and role policy at the backend boundary; never rely on hidden UI controls.
7. Keep secrets, tokens, private runtime data, and participant data out of source, fixtures, receipts, and logs.
8. Run focused tests, privacy scans, and `git diff --check`.
9. Update `PLANS.md` and `FCIS_AUDIT.md` with observed evidence and remaining gaps.
10. Commit the bounded validated slice semantically and push it to `main`. Do not rewrite published history.

## Completion boundary

Do not claim the PDF Definition of Done, production readiness, live OAuth, or live ChatGPT/MCP connectivity until the
corresponding acceptance evidence exists. A plan, generated file, or passing unit test proves only its own boundary.

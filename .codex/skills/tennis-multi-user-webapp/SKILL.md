---
name: tennis-multi-user-webapp
description: Implement and validate the Fountain Coach Tennis multi-user migration while preserving current UI behavior and separating PDF requirements from proven capability.
---

# Tennis multi-user web application

Use this skill for architecture, backend, authentication, migration, CRUD, admin, multi-user, WebKit acceptance, or
deployment-boundary work in this repository.

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

## Deployment and publication routing

Classify the request before selecting a command:

- **Application implementation/local acceptance:** use the Node/ESM package and focused tests. Reframe, FountainStore,
  EstatePublisher, DNS, and live servers are not prerequisites.
- **Tennis service release/install:** first resolve the repository's admitted typed service-release boundary. The
  current public repository has no native service-release adapter; stop at that exact seam rather than inventing SSH,
  rsync, Caddy, GitHub Pages, a static copy, or a generic hosting script.
- **Estate landing publication:** route through the parent Fountain Coach EstatePublisher/EstateStore contract using
  `estate.publication.sync`. The `estate-landing/` directory is not a publication client.
- **DNS/TLS or host audit:** treat it as infrastructure evidence only. Verify exact hostname, TLS identity, service
  readiness, and configured root separately from application or estate-content acceptance.

For any admitted mutation, establish exact target/scope/source revision, opaque credential references, readiness and
capacity, one active process, typed terminal receipt, remote read-back/digest, and rollback evidence. Never report
completion from logs, silence, process existence, HTTP status, or screenshots alone.

## Web acceptance

Use the existing repository test runner for functional smoke checks. For user-facing acceptance use Swift/WebKit:
drive the semantic accessibility/DOM tree, assert roles/names/states/actions, and capture fixed desktop/mobile
snapshots after the semantic state is established. Playwright or another generic browser may remain a development
smoke tool but is not a substitute for WebKit acceptance evidence. If the estate projection is being accepted, bind
the drive to the native Store-backed preview lease; do not use a file URL or generic static server.

## Completion boundary

Do not claim the PDF Definition of Done, production readiness, live OAuth, or live ChatGPT/MCP connectivity until the
corresponding acceptance evidence exists. A plan, generated file, or passing unit test proves only its own boundary.

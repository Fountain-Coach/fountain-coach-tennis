# FCIS audit — public tennis repository

Date: 2026-09-24

## Observed conformance

- Public repository owned by the Fountain Coach GitHub organization.
- Root `AGENTS.md`, `PLANS.md`, scoped `.codex/skills/tennis-multi-user-webapp/SKILL.md`, audit, and compliance surfaces are present.
- The attached implementation prompt is preserved as a verbatim text extraction and is explicitly separated from the reviewed plan.
- Initial content is privacy-scrubbed; runtime state, dependencies, generated archives, participant identifiers, and
  credentials are excluded.
- Existing focused application tests remain the baseline proof for the current snapshot.

## Not yet established

- Complete backend CRUD on top of the now-established normalized SQLite seam.
- Durable sessions, role enforcement, admin surface, migration, backup/restore, and multi-user isolation.
- Production deployment, live GitHub OAuth, or live ChatGPT/MCP connectivity.

No unestablished item is claimed as complete by this audit.

## Current implementation slice

- Checked-in feature/persistence inventory: present in Markdown and JSON.
- Existing server authority now preserves and validates configuration across load, update, generate, and read-back.
- A normalized SQLite schema/migration boundary is implemented and selectable with `TENNIS_STATE_BACKEND=sqlite`.
- The JSON file adapter remains the default transition backend; frontend localStorage cutover is not claimed.
- Authenticated browser writes now use the direct server operation contract; localStorage remains read-only fallback
  state and is importable only through an explicit confirmed `import_state` action.

## Estate-derived controls now adopted

- Effects are classified before mutation; hostname or repository names do not select an operation.
- Application release, estate route publication, DNS/TLS, and service installation have separate authorities and
  witnesses.
- Future admitted mutations require opaque credentials, one active process, typed terminal receipts, read-back,
  digests, and rollback evidence.
- WebKit accessibility/DOM semantics and fixed-viewport snapshots are the user-facing acceptance authorities.
- Estate-only Store publication, Reframe/FountainStore prerequisites, Governance numbering, and estate shell rules
  remain explicitly fenced from ordinary tennis development.

## Root environment

The intended target is documented in [`ENVIRONMENT.md`](ENVIRONMENT.md): a dedicated HCloud/Hetzner Cloud Ubuntu LTS
VM, Caddy-only public ingress, one private Tennis service, and server-side SQLite. This is a target contract, not
live provisioning evidence. HCloud VM identity, Caddy/TLS readiness, application health, persistence, backups, and
rollback remain unestablished until a native service-release operation proves them.

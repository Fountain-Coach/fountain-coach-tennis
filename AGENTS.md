# Fountain Coach Tennis — Agent Guide

Scope: the public customer-facing tennis application and its implementation plan.

## Authority and boundaries

- The current application in `app/` is the behavioral and visual baseline.
- `plans-proposal/tennis-multi-user-webapp-implementation-prompt.txt` is the verbatim attached specification. It is source material, not evidence that the target system already exists.
- `plans-proposal/tennis-multi-user-webapp-implementation-plan.md` is the reviewed, executable interpretation of that specification.
- `PLANS.md` pins the current bounded change and its proof gates.
- The browser must not remain authoritative for customer data after the backend migration is accepted.
- GitHub OAuth supplies identity; application roles and authorization belong to the tennis application.
- Public source must contain no participant data, session values, OAuth secrets, runtime state, private backups, or deployment credentials.
- MCP and ChatGPT connectivity are optional integrations. Repository correctness and core tests must not depend on them.
- The estate footer claim is preserved verbatim, but it must not be read as a claim that the PDF target, live OAuth, or live MCP connection is complete.

## Implementation rules

- Read this guide, `PLANS.md`, and the scoped skill before implementation.
- Reconstruct the current path from git history, current diff, tests, and live boundaries before changing architecture.
- Inventory the existing UI, entities, calculations, validation, exports, and browser persistence before designing tables or endpoints.
- Reuse the current frontend terminology and workflows. Add backend authority without silently reducing feature parity.
- Do not invent entities from the PDF's examples until the current application inventory proves they exist.
- Keep schema migrations, API authorization, validation, audit fields, and transactions testable offline.
- Never log secrets, OAuth tokens, session identifiers, or raw private payloads.
- A claim is only complete when its focused tests and acceptance evidence exist; a plan or generated manifest is not runtime proof.

## FCIS surfaces

- `AGENTS.md`: repository boundaries and implementation authority.
- `PLANS.md`: pinned scope, status, risks, and proof gates.
- `.codex/skills/tennis-multi-user-webapp/SKILL.md`: implementation procedure.
- `FCIS_AUDIT.md`: observed conformance and open evidence.
- `FCIS_COMPLIANCE_PLAN.md`: remaining conformance work.
- `plans-proposal/`: verbatim source and reviewed implementation proposal.

## Git operating habit

Use semantic commits on `main` for each bounded, validated slice. Before every change inspect history and the
working tree; after focused validation, commit and push to `main`. Do not rewrite published history or bundle
unrelated work. A commit is not a deployment or production-acceptance claim.

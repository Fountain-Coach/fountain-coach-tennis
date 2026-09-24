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
- `estate-landing/` is a checked-in projection/input for the estate route. It is not an independent publication
  authority and must not be deployed by copying its directory.

## Implementation rules

- Read this guide, `PLANS.md`, and the scoped skill before implementation.
- Reconstruct the current path from git history, current diff, tests, and live boundaries before changing architecture.
- Inventory the existing UI, entities, calculations, validation, exports, and browser persistence before designing tables or endpoints.
- Reuse the current frontend terminology and workflows. Add backend authority without silently reducing feature parity.
- Do not invent entities from the PDF's examples until the current application inventory proves they exist.
- Keep schema migrations, API authorization, validation, audit fields, and transactions testable offline.
- Never log secrets, OAuth tokens, session identifiers, or raw private payloads.
- A claim is only complete when its focused tests and acceptance evidence exist; a plan or generated manifest is not runtime proof.

## Estate-derived operational rules

These rules are portable deployment discipline, not a request to turn the tennis application into an estate runtime:

- Resolve the requested effect and exact target before mutation. A hostname, repository name, or user-facing product
  name must never select an operation by convention.
- Keep application source release, estate route publication, DNS/TLS changes, and service installation as separate
  effects with separate authorities and evidence. Do not use `git push`, a directory copy, a generic static server,
  GitHub Pages, or a remembered deployment script as proof of deployment.
- For any future live app deployment, require a typed deployment plan, one explicit source revision, exact host and
  release scope, opaque SecretStore references, capacity/readiness checks, one active operation, a typed terminal
  receipt, remote health/read-back, content or artifact digest, and rollback evidence.
- Silence, stdout, process existence, elapsed time, HTTP 200, or a screenshot alone is never completion evidence.
- DNS, TLS identity, service readiness, application acceptance, and estate publication are distinct witnesses and must
  be reported separately.
- A missing native service-release adapter is a bounded blocker. Do not replace it with direct SSH mutation, rsync,
  copied binaries, ad-hoc Caddy edits, or a new generic deployment script.

## Web acceptance authority

- Functional browser smoke tests may use the repository's existing test tooling.
- Acceptance of user-facing semantics and responsive presentation must use a native Swift/WebKit lane with the
  accessibility/DOM tree as semantic authority and fixed-viewport snapshots as visual authority.
- Use accessible roles, names, values, states, and actions; coordinate clicks and screenshot-only inspection are not
  acceptance evidence.
- For the estate landing projection, additionally use the native FountainStore/EstatePublisher preview lease when
  that estate surface is being accepted. The tennis application itself does not require Reframe or FountainStore for
  ordinary development.

## Estate-only rules that do not transfer

- `estate.publication.sync`, Store-to-Store publication, and the `estate-domain-publication` instrument govern
  estate route publication only, not tennis players, schedules, sessions, or application API data.
- Governance chapter numbering, the seven-link estate navigation, Personal Pointer shell, and estate icon contracts
  apply only to admitted estate routes.
- Reframe launch, MIDI2 readiness, FountainStore leases, and EstatePublisher are not prerequisites for ordinary
  tennis backend or frontend development. They become required only when the named estate projection or an admitted
  deployment adapter is being exercised.

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

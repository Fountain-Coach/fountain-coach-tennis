## Current bounded change — publish the FCIS implementation boundary (2026-09-24)

Capability: make the public tennis repository agentically operable and pin the complete multi-user implementation
proposal without claiming that the future backend already exists.

Status: planned implementation is pinned; this change adds the FCIS structure, verbatim source extraction, and
reviewed implementation plan. The application remains the privacy-scrubbed single-browser snapshot described in
`README.md`.

Source: [verbatim PDF extraction](plans-proposal/tennis-multi-user-webapp-implementation-prompt.txt).
Execution plan: [reviewed implementation plan](plans-proposal/tennis-multi-user-webapp-implementation-plan.md).

Proof gate for this slice:

- root `AGENTS.md`, `PLANS.md`, FCIS audit/compliance records, and the scoped skill exist;
- the proposal source is byte-stable against the PDF text extraction procedure;
- the revised plan preserves the PDF's requirements while separating observed current behavior from future work;
- existing focused application tests still pass;
- the semantic commit is pushed to `main`.

## Current bounded change — transfer estate operating discipline without estate authority (2026-09-24)

Capability: make future tennis deployment and web acceptance fail closed at the correct boundary while reusing
EstatePublisher's portable discipline: typed target/scope, opaque credentials, one active operation, terminal
receipt, read-back/digest/rollback, and separate DNS/TLS/service witnesses.

Explicit non-transfer: Store-to-Store estate publication, Reframe/FountainStore prerequisites, Governance numbering,
estate navigation/icon rules, and the `estate-domain-publication` instrument remain estate-only. The tennis repository
has no admitted native service-release adapter; a live service deployment must stop at that seam until one is added.

Proof gate: the updated `AGENTS.md` and tennis skill classify application work, estate publication, service release,
infrastructure verification, and WebKit AX/VRT acceptance; focused app tests, privacy checks, and `git diff --check`
pass; the change is committed and pushed to `main`.

## Current bounded change — define the HCloud root environment (2026-09-24)

Capability: make the intended production environment explicit without claiming that it is provisioned.

Target: one dedicated HCloud/Hetzner Cloud Ubuntu LTS VM, the smallest eligible profile with measured headroom,
Caddy as the only public edge for `tennis.fountain.coach`, one private Tennis application service, and
server-authoritative SQLite with protected backup/recovery.

Non-goals: co-hosting, a managed database, a load balancer, a second public listener, direct SSH deployment, or
provisioning infrastructure in this documentation slice.

Proof gate: `ENVIRONMENT.md` is the root contract; deployment routing names the exact HCloud VM/project, Caddy
configuration, private listener, data/backup posture, and rollback target; current app tests and `git diff --check`
pass; the change is committed and pushed to `main`.

## Next bounded change — inventory and backend seam

Capability: produce a checked-in feature/persistence inventory and introduce the smallest server-authoritative
domain seam without changing user-visible behavior.

Do not start schema design from guessed PDF examples. First inventory the current application and make the
implementation map executable.

Proof gate: inventory review, migration/schema tests, API contract tests, unchanged frontend acceptance, privacy scan,
semantic commit, and push to `main`.

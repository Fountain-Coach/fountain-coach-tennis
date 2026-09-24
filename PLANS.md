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

## Current bounded change — inventory and configuration authority seam (2026-09-24)

Capability: check in the observed feature/persistence inventory and make the existing server-owned state preserve
and validate the configuration entity already present in the browser application.

Implementation result: add Markdown/JSON inventory artifacts, centralize the observed default configuration, preserve
configuration in the server state/read model, implement validated update_configuration, and add focused authority
tests. The JSON file adapter remains transitional; SQLite and frontend cutover are deferred.

Proof gate: inventory review, configuration authority tests, existing API/MCP tests, syntax checks, privacy scan,
git diff --check, semantic commit, and push to main.

## Current bounded change — normalized SQLite seam

Capability: define and test the normalized SQLite schema and migration boundary from the checked-in feature/persistence
inventory, without changing user-visible behavior.

Do not add guessed PDF example entities. Use only the checked-in inventory and record any domain expansion.

Proof gate: inventory review, migration/schema tests, API contract tests, unchanged frontend acceptance, privacy scan,
semantic commit, and push to `main`.

Implementation result: add a versioned normalized SQLite schema for the observed players, unavailability rules,
schedule days, matches, configuration, and generated-at state. SQLite uses foreign keys and WAL mode, is selected by
`TENNIS_STATE_BACKEND=sqlite`, and is exercised through the same service mutation boundary as the transitional JSON
adapter. The default remains JSON until the frontend and operational migration are separately accepted; no PDF-only
example entities were introduced.

Proof: SQLite migration/round-trip/rejection tests pass; the authenticated remote API contract runs against SQLite;
the existing JSON MCP contract and frontend source remain unchanged in behavior; privacy scan and diff checks pass.

## Current bounded change — browser authority cutover

Capability: move authenticated application reads and writes from browser localStorage to the server authority while
preserving the current UI and retaining an explicit, auditable import path for existing local browser data.

Do not delete localStorage data or claim migration success until an explicit import, duplicate/replay policy, and
WebKit semantic acceptance are implemented.

Implementation result: authenticated application reads continue from `/api/state`, all authenticated browser writes
now use the direct `/api/operation` contract, and localStorage is no longer written after the server authority is
admitted. A user-triggered `import_state` action provides the explicit replacement path for an existing local
snapshot; it never runs automatically and requires the normal confirmation boundary. The missing optional
configuration form is guarded so the current UI does not fail during this transition.

Proof: browser source contract, import/authority tests, core tests, MCP contract, remote API contract, syntax checks,
privacy scan, diff check, semantic commit, and push to `main`.

## Current bounded change — durable identity and role boundary

Capability: replace process-local OAuth sessions and grants with durable, secure session state and enforce local
application roles at the backend boundary before adding administrative UI.

WebKit semantic acceptance and HCloud service release remain separate gates.

Implementation result: when the SQLite backend is selected, OAuth challenges, sessions, dynamic clients,
authorization codes, consent requests, access tokens, and refresh tokens use a private SQLite record store with
hashed keys. Existing admin-email role admission and scope checks remain the backend authorization boundary; no
unadmitted member role or admin UI was invented. JSON transition mode remains process-local.

Proof: restart persistence test, token-material non-storage assertion, existing OAuth/provider tests, MCP/API
contracts, syntax checks, privacy scan, diff check, semantic commit, and push to `main`.

## Current bounded change — operational data recovery boundary

Capability: define and test protected SQLite backup/restore, retention, and rollback semantics before HCloud service
release or production customer data use.

Implementation result: add native SQLite `VACUUM INTO` backups with absolute-path validation, integrity checks,
restrictive file permissions, timestamped retention, atomic staged restore, and an explicit rollback snapshot of the
previous database. This is a local recovery primitive only; it does not claim encrypted off-host backups or live host
operations.

Proof: integrity-checked backup/restore test, restrictive permission assertion, rollback read-back, retention test,
full application contracts, syntax checks, privacy scan, diff check, semantic commit, and push to `main`.

## Current bounded change — WebKit acceptance and service-release admission

Capability: establish the native Swift/WebKit semantic acceptance lane and separately resolve the missing typed HCloud
service-release adapter before any live deployment claim.

The backup primitive must be bound to that future service operation with encrypted/off-host custody, retention policy,
capacity/readiness evidence, and recovery receipts; local tests do not establish those operational witnesses.

Implementation result: add a native macOS Swift/WebKit executable that loads a selected served URL, asserts main
landmarks, customer-facing headings, planning navigation, and auth-gate presence through the DOM, then captures a
fixed 1280×800 PNG plus JSON evidence. The executable is an acceptance witness only. No HCloud service-release
adapter, SSH path, Caddy mutation, or live deployment claim was added.

Proof: Swift package build, WebKit landing-route drive, WebKit `/app/` auth-gate drive, application contracts, syntax
checks, privacy scan, diff check, semantic commit, and push to `main`.

## Next bounded change — authenticated WebKit interaction matrix

Capability: drive the admitted local OAuth session through WebKit, prove the authenticated dashboard semantics and one
confirmed server-backed mutation, and bind the result to a reproducible local runtime.

Live GitHub OAuth, ChatGPT authorization, HCloud identity, Caddy/TLS, and service-release remain separate witnesses.

## Current bounded change — agent-operated deployment contract

Capability: make the repository operable by a non-technical administrator or coding agent through one checked-in
`tennis-deploy` CLI, without exposing SSH details or credentials to the operator.

The CLI owns target validation, source revision selection, release packaging, SSH transport, systemd/Caddy release
steps, health/read-back, rollback, and a machine-readable receipt. The repository-local Codex skill is the agent
entry point: a request such as “deploy the current main branch to staging” resolves to the CLI's inspect/plan/deploy
workflow rather than an invented shell command. Secrets and private keys remain external to Git.

The first implementation slice establishes the CLI contract, environment configuration boundary, non-mutating
`inspect`, `plan`, and `verify` commands, and a mutation gate that fails closed until an explicit target profile and
release adapter are configured. It does not claim a live staging or production deployment.

The next staging adapter is intentionally isolated from the shared Mac mini edge: a Node 22 Tennis container and a
Caddy container are composed on a dedicated Docker network, exposed only on LAN port 18080, with a named SQLite
volume. It is a staging experience path, not production topology and not a replacement for the dedicated HCloud
Ubuntu/Caddy release.

Proof gate: CLI contract tests, skill validation, privacy scan, syntax checks, and `git diff --check` pass. A live
deployment remains a separate witness requiring an explicitly configured target, credentials, rollback evidence, and
remote read-back.

## Current bounded change — provision the dedicated HCloud root (2026-09-24)

Capability: provision the lean, single-purpose Ubuntu root environment named `vinegarium` for the Tennis production
service without claiming application deployment.

Implementation result: Hetzner server `167276345` is running in Nürnberg as `cx23` (2 shared vCPU, 4 GB RAM, 40 GB
disk) with Ubuntu 24.04, public IPv4 `188.245.29.232`, firewall `11673798`, and the admitted administrator SSH key.
The host was read back over SSH as Ubuntu 24.04 with 35 GB root capacity available and only SSH listening.

Proof: [`ENVIRONMENT.md`](ENVIRONMENT.md),
[`docs/history-first/hcloud-provisioning-vinegarium-20260924.md`](docs/history-first/hcloud-provisioning-vinegarium-20260924.md),
Hetzner read-back, and SSH host read-back. Remaining gates are DNS, Caddy/TLS, application release, SQLite backup
posture, GitHub OAuth, and ChatGPT/MCP acceptance.

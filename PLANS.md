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

## Current bounded change — repair ChatGPT MCP discovery behind Caddy (2026-09-24)

Capability: make the ChatGPT custom-app form complete its protected MCP scan without changing the customer-facing
landing route or bypassing OAuth.

Implementation result: the Express service now trusts the single Caddy proxy hop required by the rate limiter;
OAuth authorization, token, and refresh requests preserve ChatGPT's `resource` parameter; issued bearer tokens carry
that audience and are rejected when presented for another MCP resource; protected-resource challenges advertise the
required read/write scopes. Focused application, MCP contract, syntax, and diff checks pass.

Acceptance boundary: this proves the server-side compatibility contract. The final ChatGPT workspace/app creation and
user consent still have to be completed in ChatGPT's web administration UI.

Proof: [`ENVIRONMENT.md`](ENVIRONMENT.md),
[`docs/history-first/hcloud-provisioning-vinegarium-20260924.md`](docs/history-first/hcloud-provisioning-vinegarium-20260924.md),
Hetzner read-back, and SSH host read-back. Remaining gates are DNS, Caddy/TLS, application release, SQLite backup
posture, GitHub OAuth, and ChatGPT/MCP acceptance.

## Next bounded change — single-host live release housekeeping

Capability: operate the owner-controlled intranet app directly on `vinegarium` while keeping
`tennis.fountain.coach` as the only publishing domain and avoiding a mandatory duplicate staging host.

Plan: add the admitted live-release adapter for the existing deployer. It must package a clean pinned revision, create a
versioned release, inject opaque SecretStore-backed runtime configuration, start a private Node service, validate health,
switch Caddy atomically, read back the public domain and release digest, retain the previous release, and provide
bounded rollback. SQLite backup/restore and housekeeping retention are release gates for schema/data changes.

Non-goal: hot-editing the active directory, exposing Node publicly, sharing `vinegarium` with EstatePublisher or other
customer workloads, or treating the LAN Docker deployment as production.

Proof gate: exact host/domain/source receipt, Caddy/TLS witness, private listener witness, application health/read-back,
release digest, backup/rollback evidence, bounded retention check, GitHub OAuth acceptance, and ChatGPT/MCP acceptance.

## Current bounded change — first vinegarium production release (2026-09-24)

Implementation result: activated the customer-facing Tennis release on the dedicated `vinegarium` host at revision
`5ea2d97b2dfbf18325f2ec0421133870e5786359`, moved the HCloud-managed `tennis.fountain.coach` A record to
`188.245.29.232`, obtained trusted Caddy HTTPS, and verified the public health endpoint and direct GitHub OAuth
redirect. The release uses a private Node container, Caddy edge, persistent SQLite volume, versioned releases, and
pre-change database snapshots.

Remaining separate acceptance: complete an interactive GitHub sign-in and prove the intended ChatGPT/MCP account
connection. That is an identity/capability witness, not a prerequisite for the public landing or health route.

## Current bounded change — repair live GitHub OAuth (2026-09-24)

Implementation result: corrected production to use the registered `Fountain Coach Tennis` OAuth application, rotated
its client secret through the protected stores, requested GitHub’s JSON token response explicitly, and redeployed
revision `77c51fb0a91af3c5206eb5adf912c4a02f6f1769`.

Proof: GitHub consent screen reached with the exact production callback, callback completed successfully, Safari opened
`/app/`, and the live UI reported `ANGEMELDET · gemeinsamer Spielplan`. ChatGPT/MCP account consent remains a separate
acceptance flow.

## Current bounded change — prepare ChatGPT MCP connection (2026-09-24)

Implementation result: verified the public MCP resource metadata, authorization-server metadata, PKCE support, dynamic
registration contract, refresh-token grant declaration, and unauthenticated `/mcp` challenge. The repository now
documents the exact ChatGPT Developer Mode endpoint and the explicit read-before-write acceptance sequence.

Remaining external action: create the Custom App in ChatGPT Developer Mode using
`https://tennis.fountain.coach/mcp`, complete the OAuth consent prompt, and exercise one read-only tool before any
confirmed write. ChatGPT owns that dynamic client registration and cannot be completed by a repository deploy alone.

## Current bounded change — publish the customer-facing release description (2026-09-24)

Capability: document the working Tennis release as the primary product and keep optional identity mapping separate
from the customer promise.

Implementation result: the README now opens in German, links to the public release, describes the ODT-derived four-
match/75-minute schedule, documents JSON migration and organizer use, marks personal player access as optional, and
explicitly excludes ChatGPT/MCP from the current product requirement. A README screenshot was generated from a
sanitized release fixture with generic player names. Configuration-driven end times and match counts now correctly
display `12:00–13:15` through `15:45–17:00` and 120 games for the four-match release.

Proof: sanitized screenshot inspection, focused application tests, syntax checks, privacy/diff checks. The screenshot
is illustrative release evidence; it contains no customer roster or production state.

## Current bounded change — customer player read-only boundary (2026-09-24)

Capability: make the normal Tennis web app useful for players without requiring ChatGPT workspace membership or an AI
subscription.

Implementation result: verified OAuth identities can now be mapped in protected runtime configuration with
`TENNIS_PLAYER_IDENTITIES=email=player-id,...`. A mapped player receives a filtered personal schedule and the minimum
opponent identity needed to understand each match. Player writes and organizer controls are rejected/hidden; the
existing admin identity retains the shared organizer view and mutations. The mapping is empty by default, so no
participant data was added to the public repository or production configuration in this slice.

Proof: player OAuth/session contract, filtered state contract, rejected player mutation, full application tests, MCP and
remote authority contracts, syntax checks, privacy/diff checks. This is a read-only identity seam; player onboarding,
consent, notifications, and richer member administration remain separate work.

## Current bounded change — portable desktop-data migration (2026-09-24)

Capability: move the self-contained desktop application's private tennis data into the server authority without
requiring player identities or copying private browser storage by hand.

Implementation result: the authenticated organizer UI now offers a JSON data export and file import. The export
contains only the current tennis state; import validates the object shape, requires the existing explicit confirmation
when replacing server data, and uses the existing transactional `import_state` boundary. No participant data is
checked into Git or added to production by this slice.

Proof: portable migration browser-source assertion, existing import authority tests, full application tests, MCP and
remote authority contracts, syntax checks, privacy/diff checks. The operator must still review the file and confirm the
replacement; player identity mapping remains separate.

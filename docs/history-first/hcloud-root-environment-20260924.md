# History-first reconstruction: HCloud root environment

## Capability and requested outcome

Define the intended root hosting environment for `tennis.fountain.coach`: a lean, dedicated, HCloud-managed Ubuntu
server running only the Tennis application behind Caddy.

## Current authority and execution path

- Repository environment authority: `ENVIRONMENT.md`.
- Application authority: `app/`.
- Estate route authority: the parent Fountain Coach EstatePublisher/EstateStore path.
- Infrastructure witness procedure: the secure-publishing/deployment boundary.
- Current service-release execution path: none admitted in this public repository.

## Existing working path and evidence

The repository already separates application work, estate publication, DNS/TLS, and service installation. The
secure-publishing procedure establishes HCloud/Hetzner DNS, host identity, Caddy, and HTTPS as separate witnesses.
The EstatePublisher procedure establishes that content publication cannot be replaced by a directory copy.

## Failure evidence

No native HCloud service-release adapter, VM identity, Caddy configuration, live TLS witness, or application
read-back is present in the repository. Treating `git push` or an SSH copy as deployment would not establish the
requested host contract or rollback evidence.

## Smallest missing seam

The smallest change is to publish the root environment contract and bind the agentic routing to it. The next
implementation seam is a typed HCloud service-release adapter, not an ad-hoc script.

## Reuse decision

Reuse the EstatePublisher/secure-publishing separation of target, scope, credentials, terminal receipt, read-back,
digest, rollback, DNS, TLS, and service witnesses. Do not introduce a managed database, load balancer, co-hosted
workload, or second public listener into the lean target.

## Finite acceptance proof

1. `ENVIRONMENT.md` defines the dedicated HCloud Ubuntu/Caddy topology and non-cohosting boundary.
2. `AGENTS.md`, `PLANS.md`, the Tennis skill, and `FCIS_AUDIT.md` reference the same contract.
3. The current public app tests and documentation checks pass.
4. A semantic commit is pushed to `main`.

## Claim classification

Observed: repository boundaries and secure-publishing conventions. Intended: dedicated HCloud Ubuntu/Caddy host.
Unestablished: actual provisioning, VM identity, Caddy/TLS readiness, application release, persistence, backup, and
rollback.

## Stop condition

Stop after documenting the root environment. Provisioning requires a separate authorized deployment request and an
admitted native service-release path.

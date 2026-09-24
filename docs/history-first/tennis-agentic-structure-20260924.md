# History-first reconstruction: tennis agentic structure and implementation proposal

## Capability and requested outcome

Publish the Fountain Coach Tennis repository's mandatory FCIS agentic structure, preserve the attached
multi-user implementation prompt verbatim, revise it into an executable implementation plan, and pin that plan in
`PLANS.md`.

## Current authority and execution path

- Repository authority: the public `Fountain-Coach/fountain-coach-tennis` repository on `main`.
- Application authority: `app/`, currently a privacy-scrubbed browser-first tennis snapshot.
- Planning authority: `PLANS.md` and the reviewed plan under `plans-proposal/`.
- Procedure authority: `.codex/skills/tennis-multi-user-webapp/SKILL.md`.
- PDF source authority for requirements: the verbatim extraction under `plans-proposal/`; it is not runtime authority.

## Existing working path and evidence

The initial repository commit `6ba4481` established the public-safe app, estate projection, package lockfile, OAuth/MCP
seams, focused tests, privacy documentation, and footer claim. The organization convention was read from the public
`Fountain-Coach/FountainMaintenanceKit` repository: root `AGENTS.md`, `PLANS.md`, and `.codex/skills/`.

## Failure evidence

The target repository had no `AGENTS.md`, `PLANS.md`, scoped skill, audit record, or compliance plan. The PDF
requirements were previously described but not preserved as a verbatim repository artifact. The current app still
uses browser `localStorage`; it does not establish a multi-user backend, durable sessions, admin authorization,
production OAuth, or live ChatGPT/MCP connectivity.

## Smallest missing seam

For this change, the smallest seam is the FCIS publication boundary: agent guidance, a pinned plan, exact source
extraction, and explicit evidence classification. The next implementation seam is a checked-in current-behavior
inventory before any schema or API design.

## Reuse decision

Reuse the current app, its tests, its package/runtime boundary, the existing privacy documentation, and the
organization's published FCIS structure. Do not add a parallel runtime, infer PDF example entities, or claim future
backend work from documentation alone.

## Finite acceptance proof

1. Required agentic files and scoped procedure exist.
2. The verbatim extraction compares byte-for-byte with the PDFKit extraction command.
3. The reviewed plan distinguishes observed current behavior from future implementation.
4. Existing focused tests, syntax checks, and privacy scans pass.
5. A semantic commit is pushed to `main`, and remote read-back identifies the same commit and files.

## Claim classification

Observed: public repository, current app snapshot, organization convention, source extraction, and documentation
surfaces. Inferred: the Node/ESM boundary is the smallest first backend implementation boundary. Unestablished:
server-authoritative SQLite, full CRUD, roles, migration, backup/restore, production deployment, and live OAuth/MCP.

## Stop condition

Stop after the agentic structure, verbatim proposal, reviewed plan, focused validation, commit, and remote push are
complete. Future backend implementation requires its own bounded plan update and evidence.

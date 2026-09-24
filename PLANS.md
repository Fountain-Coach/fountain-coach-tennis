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

## Next bounded change — inventory and backend seam

Capability: produce a checked-in feature/persistence inventory and introduce the smallest server-authoritative
domain seam without changing user-visible behavior.

Do not start schema design from guessed PDF examples. First inventory the current application and make the
implementation map executable.

Proof gate: inventory review, migration/schema tests, API contract tests, unchanged frontend acceptance, privacy scan,
semantic commit, and push to `main`.

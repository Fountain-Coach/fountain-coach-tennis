# History-first reconstruction — minimal OAuth entry

Date: 2026-09-24

## Requested outcome

Reduce the public entry to one customer-facing screen with the Tennisrunde title, tennis-ball logo, and one OAuth
login action. After OAuth callback, enter `/app/` directly.

## Existing authority and path

The Node/ESM server serves `app/index.html` at `/`, protects `/app/`, and owns the OAuth callback in
`app/mcp-server.mjs`. The authenticated dashboard already lives in `app/app.html`; browser state and API authority
remain unchanged.

## What previously worked

GitHub/provider OAuth, local OAuth, session admission, the authenticated dashboard, and the staging release were
already covered by application tests and the deployed staging receipt for `0d6cdef`.

## What was unnecessary

The public root loaded a Three/Cannon/Csound puppet animation, a fallback animation, dashboard markup, and a planning
link before authentication. Those assets created a presentation route and an avoidable root-to-login-to-app path.

## Smallest seam implemented

`/` is now a static, script-free OAuth entry. `/auth/*` redirects successful browser OAuth directly to `/app/`, and
the server serves the existing dashboard document at `/app/`. The animation files and their runtime dependencies were
removed; the shared CSS retains only the tennis-ball logo needed by the entry and dashboard.

## Acceptance proof

The bounded proof is: root DOM exposes one heading, one tennis-ball image, and `/auth/login`; root has no scripts;
`/app/` still exposes the auth gate; syntax, application tests, `git diff --check`, and native WebKit fixed-viewport
evidence pass. The stop condition is a failed root/app semantic check or a changed OAuth callback contract.

Observed: the source route and OAuth callback are changed as described. Inferred: the public entry is simpler and has
no animation dependency. Unestablished until the next staging release: live staging serves this revision.

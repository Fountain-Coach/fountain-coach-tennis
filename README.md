# Fountain Coach Tennisrunde

This public repository is the privacy-scrubbed initial customer-facing snapshot of the `tennis.fountain.coach` subdomain.

It contains the current tennis landing page, browser application, scheduling rules, MCP/OAuth integration seam, tests, and the estate landing projection. The starter model uses generic player labels; no participant names, availability dates, runtime state, credentials, tokens, or generated private artifacts are included.

## Why “Vinegarium”

`vinegarium.de` is the customer-owned domain and business identity behind this work. Its owner is also one of the
tennis players. We are developing the business together, beginning with a deliberately focused spare-time project:
the first practical product is a tennis match and shared tennis round.

That is why the dedicated HCloud host is named `vinegarium`, while the customer-facing publishing domain remains
`tennis.fountain.coach`. The name describes the business context; Tennis is the first small, useful application we
are building within it. This repository intentionally does not publish the owner’s personal name or participant data.

## Current status

The initial snapshot remains a feature-complete single-browser/static-preview application. The server now has a
normalized SQLite authority seam selected with `TENNIS_STATE_BACKEND=sqlite`, while browser `localStorage` remains
the current frontend persistence mode until the explicit authority cutover. It is not yet the completed multi-user
production application.

The attached implementation prompt is treated as the target specification for the next phases: server-authoritative SQLite, GitHub identity, local application roles, protected `/admin`, full domain CRUD, migration/import/export, auditability, backup/restore, multi-user tests, and independently reproducible deployment. See [docs/implementation-map.md](docs/implementation-map.md).

## Run locally

```sh
npm ci --prefix app
npm test --prefix app
npm run test:e2e --prefix app
```

The current static preview is:

```sh
node app/preview.mjs
```

The native macOS/WebKit acceptance lane is built and run against a served URL with:

```sh
swift build --package-path acceptance/webkit
acceptance/webkit/.build/arm64-apple-macosx/debug/TennisWebKitAcceptance --url http://127.0.0.1:8787/
```

It records DOM-semantic evidence and a fixed viewport snapshot in the selected output directory. It is not a
deployment mechanism.

This is development-only. Configure a real HTTPS deployment, server-side state, OAuth, and operational controls before using customer data.

## Privacy and ownership

- [PRIVACY.md](PRIVACY.md) records what was removed from this public seed and what remains to be implemented.
- [SECURITY.md](app/SECURITY.md) describes the current security boundary and unresolved production requirements.
- [docs/deployment.md](docs/deployment.md) explains local `.env` development and protected GitHub production secrets.
- [docs/footer-claim.md](docs/footer-claim.md) preserves the estate footer claim verbatim and explains its scope.
- OAuth client values, session secrets, bearer tokens, player data, and deployment credentials belong in the operator's secret/configuration systems, never in Git.

GitHub identifies a person; the Tennis application must own its local account, role, and authorization. Repository ownership and hosting administration remain separate authority domains.

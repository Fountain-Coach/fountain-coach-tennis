# History-first evidence — Tennis public-edge estate convergence — 2026-09-27

## Trigger

Chapter 152 durable production publication promoted all nine estate domains to the authenticated production
FountainStore. Public HTTPS verification failed on the Tennis estate file `tennis-template-contract.json`.

## Observed topology

- Production FountainStore authority: `store.fountain.coach` / `65.109.14.71`.
- Public Tennis edge: `tennis.fountain.coach` / `vinegarium` / `188.245.29.232`.
- Direct Store request with Tennis Host identity returned the exact expected contract bytes and digest.
- Public Tennis request returned HTTP 404 while `/` and `/index.html` were served by the standalone Tennis app.
- Vinegarium runs a Caddy edge container and a private Tennis application container.
- The active Caddyfile proxied the entire host to `tennis-app:8787`.

## Authority decision

The parent estate remains authored/published by EstatePublisher/FountainStore. The Tennis repository owns the
customer application service release. Therefore the edge must split by path rather than copy `estate-landing/` into a
second publication authority.

Dynamic application prefixes remain on the private Tennis service. All other public paths are reverse-proxied to the
authoritative FountainStore identity with the Tennis Host header preserved for estate selection.

## Acceptance

Before production mutation, the candidate Caddy configuration was validated against `caddy:2.10-alpine`. Production
release must use the checked-in versioned `tennis-deploy.mjs` adapter, retain rollback, and pass public application
health plus estate-static digest read-back. Parent Fountain Host production E2E is the terminal acceptance authority.

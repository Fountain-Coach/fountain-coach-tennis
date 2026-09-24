# Vinegarium production release witness — 2026-09-24

This witness records the first customer-facing deployment and the subsequent OAuth repair for `tennis.fountain.coach`
on the dedicated HCloud host `vinegarium`.

## Boundary and source

- Repository: `Fountain-Coach/fountain-coach-tennis`
- Branch: `main`
- Initial source revision: `5ea2d97b2dfbf18325f2ec0421133870e5786359`
- Current source revision: `77c51fb0a91af3c5206eb5adf912c4a02f6f1769`
- Host: `vinegarium` / `188.245.29.232`
- Public hostname: `tennis.fountain.coach`
- Runtime: Dockerized Node application behind Caddy on Ubuntu 24.04
- State: persistent SQLite volume on the host; runtime secrets are installed outside Git

## Evidence

1. The checked-in production deployer packaged the clean source revision and installed the current release at
   `/opt/tennis/releases/77c51fb0a91af3c5206eb5adf912c4a02f6f1769`.
2. `/opt/tennis/active` resolved to that release after activation. The prior release remained available for rollback.
3. The internal application health read-back returned:

   ```json
   {"ok":true,"service":"fountain-coach-tennis"}
   ```

4. HCloud DNS was updated through the RRSet `set_records` action and verified at the authoritative nameserver:
   `tennis.fountain.coach A 188.245.29.232`.
5. Public HTTPS read-back returned HTTP 200 from `https://tennis.fountain.coach/healthz` with the same health payload.
6. The public landing title is `Tennisrunde · Privater Zugang`.
7. `https://tennis.fountain.coach/auth/login` redirects directly to GitHub and carries the production callback URI
   `https://tennis.fountain.coach/auth/github/callback`.
8. After the OAuth app credential correction and the GitHub JSON token-response fix, an authenticated Safari session
   completed the callback and opened `/app/`; the app’s live connection label changed to `ANGEMELDET · gemeinsamer
   Spielplan`.

## Bounded limitations

This proves the public release, TLS, application health, and OAuth-provider redirect boundary. It does not claim that
an interactive GitHub login has been completed in a user browser, nor that the optional ChatGPT/MCP connection has been
admitted. Those require a separate authenticated acceptance witness.

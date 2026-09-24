# Tennis deployment: local development and production

This guide explains the two configuration lanes:

- local development uses a private `.env` file on the developer's machine;
- production deployment uses protected GitHub Environment secrets and never checks those values into the repository.

The two lanes use the same variable names, but they are different stores. A local `.env` is not uploaded to GitHub,
and GitHub secrets are not downloaded into a developer's working copy.

## Local development

1. Copy the template:

   ```sh
   cp .env.example .env
   ```

2. Fill in only development credentials and use a development callback URL, for example
   `http://127.0.0.1:8787/auth/github/callback`.

3. Run the app with the environment loaded by your local process manager. Do not paste `.env` values into tickets,
   chat, screenshots, shell history, or test fixtures.

`.env`, SQLite files, audit logs, backups, keys, and certificates are excluded by `.gitignore`. Verify before pushing:

```sh
git status --short
git check-ignore .env
node deploy/tennis-deploy.mjs verify
```

## Live intranet configuration

The canonical live host is `vinegarium` and the canonical publishing domain is `tennis.fountain.coach`. A separate
staging host is optional for this owner-controlled intranet application. The LAN Docker deployment may still be used
as a disposable preflight, but it is not required before every live release.

Live releases must remain atomic: package one clean revision, install it beside the active release, start and health
check it privately, switch Caddy, retain the previous release for rollback, and prune only after read-back succeeds.
Never overwrite the active directory or expose the Node listener directly.

## Production configuration

Create a GitHub Environment named `production` in the repository settings. Protect it with required reviewers and
restrict which branches may deploy. Add these as **Environment secrets**, not ordinary repository files or workflow
variables:

| Secret | Purpose |
| --- | --- |
| `TENNIS_PRODUCTION_SSH_KEY` | Dedicated deployment key, limited to the Tennis host and deploy account |
| `TENNIS_PRODUCTION_GITHUB_OAUTH_CLIENT_SECRET` | GitHub OAuth client secret |
| `TENNIS_PRODUCTION_SESSION_SECRET` | Server-side session signing/encryption material |
| `TENNIS_PRODUCTION_MCP_BEARER_TOKEN` | Optional owner-only compatibility lane |
| `TENNIS_PRODUCTION_NATIVE_BEARER_TOKEN` | Optional native bridge credential |

The live release adapter also consumes `TENNIS_PRODUCTION_GITHUB_OAUTH_CLIENT_ID`. The verified GitHub admin email is
the protected Environment variable `TENNIS_PRODUCTION_ADMIN_EMAILS`; it is not embedded in the source release.

For player access, configure `TENNIS_PLAYER_IDENTITIES` only in the protected production environment, never in the
repository. Its value is a comma-separated mapping from each verified OAuth email to an existing player ID, for example
`player@example.com=p1,another@example.com=p2`. The mapping grants read-only access to that player's filtered schedule;
it does not grant schedule editing, player administration, or MCP write access. Do not add a mapping until the
corresponding player record and consent/privacy basis have been reviewed.

Non-secret deployment values may be stored as Environment variables, for example the exact host, deploy user,
hostname, and public OAuth callback URI. Keep the production environment separate from staging.

The deployment workflow must map these secrets into the deployer's runtime environment only for the approved job.
Secrets must not be written to artifacts, receipts, logs, command-line arguments, or generated source files. GitHub
does not expose Environment secrets to unapproved jobs or forked pull requests; use a manual production approval gate.

## What the customer needs to do

The customer does not need SSH knowledge. An authorized administrator selects `production` and approves the GitHub
deployment. The workflow runs the checked-in `tennis-deploy` CLI, which performs preflight, release, health/read-back,
and rollback checks. The administrator sees a success or a clear blocked result, never the secret values.

Before customer data is admitted, the operator must provide encrypted off-host SQLite backups and a tested restore.
The production adapter installs the release under `/opt/tennis/releases/<revision>`, preserves the prior release and
a pre-change SQLite snapshot, activates Docker/Caddy, and verifies `https://tennis.fountain.coach/healthz` before
returning a receipt. It never overwrites the active release in place.

## Rotation and incident response

Rotate OAuth secrets, session secrets, deploy keys, and bearer tokens through the GitHub Environment and the host's
secret store. Revoke the old value only after the new value has been installed and verified. If a secret may have
appeared in Git, chat, a log, or a screenshot, treat it as compromised immediately: revoke it, replace it, and inspect
the relevant access history. Do not try to hide the exposure by deleting a file or rewriting history.

## Deployment commands

The checked-in CLI is the agent-facing contract:

```sh
node deploy/tennis-deploy.mjs inspect --environment production
node deploy/tennis-deploy.mjs plan --environment production
node deploy/tennis-deploy.mjs verify
```

Mutation remains fail-closed unless the operator supplies the exact production profile, external secrets, and `--yes`.
A GitHub push is source publication, not a production deployment; the deployer packages the pinned clean revision and
performs the release separately.

The checked-in workflow is `.github/workflows/deploy-production.yml`. It is manually triggered, uses the protected
`production` Environment, serializes production attempts, and requires typing `DEPLOY`. The current verified live
release was performed through the same checked-in CLI path with the production secrets supplied by the protected
environment boundary.

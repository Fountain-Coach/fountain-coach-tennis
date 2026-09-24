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

Non-secret deployment values may be stored as Environment variables, for example the exact host, deploy user,
hostname, and public OAuth callback URI. Keep the production environment separate from staging.

The deployment workflow must map these secrets into the deployer's runtime environment only for the approved job.
Secrets must not be written to artifacts, receipts, logs, command-line arguments, or generated source files. GitHub
does not expose Environment secrets to unapproved jobs or forked pull requests; use a manual production approval gate.

## What the customer needs to do

The customer does not need SSH knowledge. An authorized administrator selects `production` and approves the GitHub
deployment. The workflow runs the checked-in `tennis-deploy` CLI, which performs preflight, release, health/read-back,
and rollback checks. The administrator sees a success or a clear blocked result, never the secret values.

Before production is enabled, the operator must also provide encrypted off-host SQLite backups, a tested restore,
the exact HTTPS hostname, and a dedicated Ubuntu host with Caddy as the public edge. The current repository contains
the configuration contract and read-only preflight; it does not yet claim that the production release adapter or
live production workflow is complete.

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

Mutation remains fail-closed until the typed production release adapter has been implemented and accepted. A GitHub
push is source publication, not a production deployment.

---
name: tennis-deployment
description: Operate the checked-in Tennis deployment CLI for inspect, plan, verify, staging, production, and rollback requests.
---

# Tennis deployment

Use this skill when the user asks to deploy, release, inspect, verify, roll back, or check readiness for the Tennis
application. The CLI in `deploy/tennis-deploy.mjs` is the deployment contract; do not invent SSH commands.

Read `AGENTS.md`, `PLANS.md`, and `ENVIRONMENT.md` before a live operation. Start with:

```sh
node deploy/tennis-deploy.mjs inspect --environment staging
node deploy/tennis-deploy.mjs plan --environment staging
node deploy/tennis-deploy.mjs verify
```

The current slice deliberately fails closed for mutation until a release adapter is configured. Do not bypass that
boundary with `ssh`, `scp`, `rsync`, copied binaries, ad-hoc Caddy edits, or a new untracked script. Never put SSH
keys, OAuth values, session secrets, SQLite files, or customer data in the repository or command output.

For an admitted future mutation, require a clean source revision, exact environment profile, one active operation,
atomic release activation, private application binding, Caddy validation, health/read-back, receipt, and rollback
evidence. A successful Git push, process existence, HTTP status, or screenshot is not deployment proof.

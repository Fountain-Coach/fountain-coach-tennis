# Tennis root environment

Status: target environment contract; live provisioning and deployment are not yet evidenced.

## Purpose

Host only the customer-facing `tennis.fountain.coach` application on a minimal HCloud-managed server. HCloud means
Hetzner Cloud in this repository. The environment is intentionally single-purpose: one tennis application, one
dedicated host, one reverse proxy, and no co-hosted customer or estate workloads.

## Target topology

```
Public DNS (HCloud-managed)
        |
tennis.fountain.coach
        |
HCloud / Hetzner Cloud VM
  Ubuntu LTS, smallest eligible profile with measured headroom
  Caddy :80/:443
        |
  loopback-only Tennis application service
        |
  server-authoritative SQLite on the VM's persistent application storage
```

## Environment contract

- **Provider:** HCloud/Hetzner Cloud project controlled by Fountain Coach.
- **Compute:** the cheapest currently eligible shared VM profile that satisfies the application's measured CPU,
  memory, disk, backup, and availability requirements. Do not hard-code a product name or infer one from a
  repository name.
- **Operating system:** supported Ubuntu LTS, kept patched through the host's controlled maintenance procedure.
- **Workload:** only the Tennis application and its required OS/service components. No unrelated sites, repositories,
  databases, workers, staging apps, or shared customer workloads.
- **Public edge:** Caddy is the only public HTTP/TLS listener for `tennis.fountain.coach`. The application is
  bound to loopback or a private local socket and is never exposed directly.
- **TLS:** Caddy obtains and renews the certificate for the exact hostname. TLS identity is verified independently
  from application health.
- **Data:** SQLite is the authoritative application database after migration. Database files, backups, sessions,
  and runtime state stay on the server and never enter the public repository.
- **Identity:** GitHub OAuth credentials and session secrets remain in SecretStore-backed runtime configuration.
- **DNS:** the exact `tennis.fountain.coach` record is managed through the approved HCloud/Hetzner DNS path. DNS
  mutation and Caddy/application release are separate operations.
- **Access:** host administration is restricted and audited; the application process is non-root. Public ingress is
  limited to the required HTTP/HTTPS edge, with administrative access kept outside the application path.
- **Durability:** “cheapest” never means removing security, encrypted/off-host backups, integrity checks, rollback,
  or enough disk headroom for SQLite and recovery. A smaller profile is acceptable only after measured acceptance.

## Release boundary

This file describes the intended host, not a deployment mechanism. A GitHub push is source synchronization, not
deployment. A future live release must resolve an admitted typed HCloud service-release operation with the exact
hostname, VM identity, source revision, release scope, credential references, readiness/capacity checks, one active
process, terminal receipt, health/read-back, digest, and rollback evidence.

The current public repository has no such native service-release adapter. Until one is implemented and accepted, stop
at that seam; do not substitute direct SSH, rsync, copied binaries, ad-hoc Caddy edits, GitHub Pages, or a generic
hosting script.

Estate landing publication remains separate: if `estate-landing/` is published as an estate route, use the parent
EstatePublisher/EstateStore contract. It is not a second HCloud application deployment path.

# Tennis root environment

Status: dedicated HCloud host provisioned; application, DNS, TLS, backups, and production release remain pending.

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

## Provisioned host witness

The dedicated production host was provisioned on 2026-09-24 and is recorded in
[`docs/history-first/hcloud-provisioning-vinegarium-20260924.md`](docs/history-first/hcloud-provisioning-vinegarium-20260924.md).

- **Server:** `vinegarium` / Hetzner server ID `167276345`
- **Location:** Nürnberg (`nbg1`)
- **Image:** Ubuntu 24.04
- **Type:** `cx23`, 2 shared vCPU, 4 GB RAM, 40 GB local disk
- **Public address:** `188.245.29.232`
- **Firewall:** `vinegarium-edge-20260924` / ID `11673798`, ingress limited to SSH, HTTP, HTTPS, and ICMP
- **SSH key:** `vinegarium-admin-20260924` / fingerprint `fa:94:b5:eb:da:ba:a3:c1:ab:0e:c4:46:23:76:e6:98`
- **Host read-back:** `vinegarium`, Ubuntu 24.04, 38 GB root filesystem with 35 GB available, 3.3 GiB memory
  available, SSH only listening at inspection time
- **Cost witness:** CX23 is €5.49 net / €6.5331 gross monthly before IPv4 and other optional services

This proves provisioning and base-host access only. It does not prove that `tennis.fountain.coach` resolves to this
address, that Caddy or Tennis is installed, that TLS is active, or that OAuth/MCP is connected.

## Operating model: single live intranet host

The canonical publishing domain remains `tennis.fountain.coach`. Because this is an owner-controlled intranet
application, a separate always-on staging host is optional rather than required. `vinegarium` is the planned live
development and production host; the LAN Docker deployment remains available as a disposable preflight witness.

Direct live development is governed by release housekeeping:

- every release has one source revision and a versioned remote directory;
- the new process is health-checked before traffic switches;
- Caddy remains the only public edge and the Node listener remains private;
- the previous release stays available for immediate rollback;
- SQLite is backed up before schema/data changes and retained off-host according to the recovery policy;
- old releases, logs, and temporary archives are bounded and pruned only after a successful read-back;
- OS, Caddy, Node, OAuth, database, disk, backup, and certificate health are checked separately.

“No staging” therefore means no duplicate production-like server, not an in-place overwrite of the running service.

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

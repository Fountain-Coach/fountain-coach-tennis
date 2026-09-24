# History-first reconstruction — HCloud provisioning: vinegarium

Date: 2026-09-24

## Requested outcome

Provision the dedicated, cheapest sensible Ubuntu HCloud machine for the Tennis application and name it
`vinegarium`.

## Authority and execution path

The repository environment contract is [`ENVIRONMENT.md`](../../ENVIRONMENT.md). Hetzner Cloud was controlled through
the authenticated `hcloud` CLI context `fountainai`; no repository secret or API token was written.

## Provisioning witness

- Hetzner server: `vinegarium`, ID `167276345`, status `running`
- Location: Nürnberg (`nbg1`)
- Image: Ubuntu 24.04, x86
- Type: `cx23`, 2 shared vCPU, 4 GB RAM, 40 GB local disk
- Public IPv4: `188.245.29.232`
- Monthly price returned by Hetzner: €5.49 net / €6.5331 gross, before IPv4 and optional services
- Firewall: `vinegarium-edge-20260924`, ID `11673798`, applied to the server
- Inbound rules: TCP 22, TCP 80, TCP 443, ICMP; IPv4 and IPv6 sources
- SSH key: `vinegarium-admin-20260924`, ID `130438911`, fingerprint
  `fa:94:b5:eb:da:ba:a3:c1:ab:0e:c4:46:23:76:e6:98`

## Host read-back

SSH to `root@188.245.29.232` succeeded using the injected local administrator key. The host identified itself as
`vinegarium` running Ubuntu 24.04. The root filesystem reported 38 GB total, 35 GB available, and memory reported
3.3 GiB available. At the time of inspection, only SSH listeners were active; no Caddy or Tennis service was claimed.

## Reuse and remaining seam

The existing `ENVIRONMENT.md` topology, HCloud project, local SSH key, and firewall boundary were reused. The next
seam is a governed service release: install Caddy and the Tennis application privately, bind DNS and TLS separately,
configure SecretStore-backed GitHub OAuth/session values, establish SQLite backups, and prove health/read-back and
rollback. The earlier LAN Docker staging remains a staging witness, not production proof.

## Claim classification

Observed: Hetzner API server/firewall/key records and SSH base-host read-back. Inferred: CX23 is the smallest sensible
profile for the documented Node/Caddy/SQLite workload. Unestablished: DNS now points to the host, Caddy/TLS,
application deployment, OAuth, MCP, backups, rollback, and customer-facing production readiness.

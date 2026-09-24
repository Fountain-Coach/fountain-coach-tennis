#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';

const root = resolve(new URL('..', import.meta.url).pathname);
const args = process.argv.slice(2);
const command = args[0] || 'help';
const skipPublicCheck = args.includes('--skip-public-check');
const environment = value('--environment') || value('-e') || process.env.TENNIS_DEPLOY_ENVIRONMENT || 'staging';

function value(flag) {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
}

function git(...gitArgs) {
  return execFileSync('git', ['-C', root, ...gitArgs], { encoding: 'utf8' }).trim();
}

function profile() {
  const host = process.env[`TENNIS_${environment.toUpperCase()}_HOST`];
  const user = process.env[`TENNIS_${environment.toUpperCase()}_USER`];
  const key = process.env[`TENNIS_${environment.toUpperCase()}_SSH_KEY`];
  const hostname = process.env[`TENNIS_${environment.toUpperCase()}_HOSTNAME`];
  return { environment, host, user, key, hostname };
}

function remoteInspection(p) {
  if (!p.host || !p.user || !p.key) return { state: 'not-configured' };
  try {
    const output = execFileSync('ssh', ['-o', 'BatchMode=yes', '-o', 'ConnectTimeout=5', '-i', p.key,
      `${p.user}@${p.host}`, 'set -eu; printf "host=%s\\n" "$(hostname)"; printf "kernel=%s\\n" "$(uname -srm)"; printf "node=%s\\n" "$(command -v node || true)"; printf "caddy=%s\\n" "$(command -v caddy || true)"; printf "listeners=%s\\n" "$(ss -ltnH 2>/dev/null | awk \'{print $4}\' | sort -u | tr "\\n" ",")"; printf "root=%s\\n" "$(df -P / | tail -1)"'], { encoding: 'utf8' }).trim().split('\n');
    const fields = Object.fromEntries(output.map((line) => { const separator = line.indexOf('='); return [line.slice(0, separator), line.slice(separator + 1)]; }));
    return {
      state: 'reachable',
      hostName: fields.host || null,
      kernel: fields.kernel || null,
      node: fields.node || null,
      caddy: fields.caddy || null,
      listeners: (fields.listeners || '').split(',').filter(Boolean),
      rootFilesystem: fields.root || null
    };
  } catch (error) {
    return { state: 'blocked', detail: String(error.message || error).replace(/(identity|secret|token|password|key)[^\n]*/gi, '$1=REDACTED').slice(0, 500) };
  }
}

function plan() {
  const revision = git('rev-parse', 'HEAD');
  const branch = git('branch', '--show-current');
  const dirty = git('status', '--porcelain');
  return {
    schema: 'fountain-coach.tennis.deploy-plan.v1',
    environment,
    source: { branch, revision, dirty: dirty.length > 0 },
    target: profile(),
    release: {
      application: 'tennis',
      runtime: 'node-esm',
      stateBackend: 'sqlite',
      applicationBind: '127.0.0.1',
      edge: 'caddy',
      rollback: 'previous-atomic-release'
    },
    mutation: environment === 'production' ? 'typed-atomic-docker-caddy-release' : 'typed-staging-docker-release'
  };
}

function inspect() {
  const p = profile();
  const result = {
    schema: 'fountain-coach.tennis.deploy-inspection.v1',
    environment,
    sourceRevision: git('rev-parse', 'HEAD'),
    workingTreeClean: git('status', '--porcelain').length === 0,
    targetConfigured: Boolean(p.host && p.user && p.key && p.hostname),
    target: { environment, hostConfigured: Boolean(p.host), userConfigured: Boolean(p.user), keyConfigured: Boolean(p.key), hostnameConfigured: Boolean(p.hostname) },
    remote: remoteInspection(p),
    mutation: 'not-run'
  };
  console.log(JSON.stringify(result, null, 2));
}

function verify() {
  const packageJSON = JSON.parse(readFileSync(resolve(root, 'app/package.json'), 'utf8'));
  const checks = {
    packagePresent: Boolean(packageJSON.name),
    sqliteSelectable: readFileSync(resolve(root, 'app/package.json'), 'utf8').includes('sqlite'),
    environmentDocumented: Boolean(readFileSync(resolve(root, 'ENVIRONMENT.md'), 'utf8')),
    secretsOutsideGit: !git('ls-files').split('\n').some((file) => /(^|\/)(\.env($|\.(?!example$))|.*\.(sqlite|sqlite3|db)$|id_ed25519|.*\.pem$)/i.test(file))
  };
  const passed = Object.values(checks).every(Boolean);
  console.log(JSON.stringify({ schema: 'fountain-coach.tennis.deploy-verification.v1', passed, checks }, null, 2));
  if (!passed) process.exitCode = 1;
}

function deploy() {
  const p = profile();
  if (process.env.TENNIS_DEPLOY_ALLOW_MUTATION !== '1' || args.indexOf('--yes') < 0) {
    console.error('blocked: deployment mutation requires TENNIS_DEPLOY_ALLOW_MUTATION=1 and --yes');
    process.exitCode = 2;
    return;
  }
  if (!p.host || !p.user || !p.key || !p.hostname) {
    console.error(`blocked: ${environment} target profile is incomplete`);
    process.exitCode = 2;
    return;
  }
  if (git('status', '--porcelain')) {
    console.error('blocked: source tree must be clean before release');
    process.exitCode = 2;
    return;
  }
  const revision = git('rev-parse', 'HEAD');
  if (environment === 'production') return deployProduction(p, revision);
  return deployStaging(p, revision);
}

function deployStaging(p, revision) {
  const work = mkdtempSync(resolve(tmpdir(), 'tennis-release-'));
  const archive = resolve(work, `${revision}.tar.gz`);
  try {
    execFileSync('git', ['-C', root, 'archive', '--format=tar.gz', '--output', archive, revision], { stdio: 'inherit' });
    const remoteArchive = `/tmp/tennis-release-${revision}.tar.gz`;
    execFileSync('scp', ['-q', '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=10', '-i', p.key,
      archive, `${p.user}@${p.host}:${remoteArchive}`], { stdio: 'inherit' });
    const remote = [
      'set -eu',
      'command -v docker >/dev/null',
      'docker compose version >/dev/null',
      'test ! -e "$HOME/tennis-staging/active" || true',
      `release="$HOME/tennis-staging/releases/${revision}"`,
      'mkdir -p "$release"',
      `tar -xzf '${remoteArchive}' -C "$release"`,
      'docker compose -p tennis-staging -f "$release/deploy/compose.staging.yml" up -d --build',
      'curl --fail --silent --show-error --retry 20 --retry-all-errors --retry-delay 1 http://127.0.0.1:18080/healthz >/dev/null',
      `printf '{"schema":"fountain-coach.tennis.deploy-receipt.v1","state":"succeeded","environment":"${environment}","revision":"${revision}","url":"http://${p.host}:18080/","health":"http://127.0.0.1:18080/healthz"}\n'`,
      `rm -f '${remoteArchive}'`
    ].join('; ');
    const result = execFileSync('ssh', ['-o', 'BatchMode=yes', '-o', 'ConnectTimeout=10', '-i', p.key,
      `${p.user}@${p.host}`, remote], { encoding: 'utf8' });
    console.log(result.trim());
  } catch (error) {
    console.error(`blocked: staging release failed: ${String(error.message || error).slice(0, 800)}`);
    process.exitCode = 1;
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

function shellQuote(value) {
  return `'${String(value).replaceAll("'", "'\\''")}'`;
}

function productionEnvironment() {
  const values = {
    NODE_ENV: 'production',
    PORT: '8787',
    BASE_URL: 'https://tennis.fountain.coach',
    OAUTH_ISSUER: 'https://tennis.fountain.coach',
    OAUTH_IDP: 'github',
    GITHUB_OAUTH_CLIENT_ID: process.env.TENNIS_PRODUCTION_GITHUB_OAUTH_CLIENT_ID,
    GITHUB_OAUTH_CLIENT_SECRET: process.env.TENNIS_PRODUCTION_GITHUB_OAUTH_CLIENT_SECRET,
    GITHUB_OAUTH_REDIRECT_URI: 'https://tennis.fountain.coach/auth/github/callback',
    TENNIS_ADMIN_EMAILS: process.env.TENNIS_PRODUCTION_ADMIN_EMAILS,
    SESSION_SECRET: process.env.TENNIS_PRODUCTION_SESSION_SECRET,
    TENNIS_STATE_BACKEND: 'sqlite',
    TENNIS_SQLITE_FILE: '/var/lib/tennis/tennis.sqlite',
    TENNIS_AUDIT_FILE: '/var/lib/tennis/audit.jsonl',
    CORS_ORIGINS: 'https://tennis.fountain.coach'
  };
  const missing = Object.entries(values).filter(([, value]) => value === undefined || value === '').map(([key]) => key);
  if (missing.length) throw new Error(`blocked: production configuration missing ${missing.join(', ')}`);
  for (const [key, value] of Object.entries(values)) {
    if (String(value).includes('\n') || String(value).includes('\r')) throw new Error(`blocked: production configuration contains a line break in ${key}`);
  }
  return Object.entries(values).map(([key, value]) => `${key}=${value}`).join('\n') + '\n';
}

function deployProduction(p, revision) {
  const work = mkdtempSync(resolve(tmpdir(), 'tennis-production-release-'));
  const archive = resolve(work, `${revision}.tar.gz`);
  const envFile = resolve(work, 'tennis.env');
  try {
    const productionEnv = productionEnvironment();
    writeFileSync(envFile, productionEnv, { mode: 0o600 });
    chmodSync(envFile, 0o600);
    execFileSync('git', ['-C', root, 'archive', '--format=tar.gz', '--output', archive, revision], { stdio: 'inherit' });
    const remoteArchive = `/tmp/tennis-production-release-${revision}.tar.gz`;
    const remoteEnv = `/tmp/tennis-production-env-${revision}`;
    execFileSync('scp', ['-q', '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=10', '-i', p.key,
      archive, `${p.user}@${p.host}:${remoteArchive}`], { stdio: 'inherit' });
    execFileSync('scp', ['-q', '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=10', '-i', p.key,
      envFile, `${p.user}@${p.host}:${remoteEnv}`], { stdio: 'inherit' });
    const releaseRoot = '/opt/tennis';
    const remote = [
      'set -Eeuo pipefail',
      'rollback() { code=$?; if [ "$code" -ne 0 ] && [ -n "${previous:-}" ] && [ -d "$previous" ]; then rm -f /opt/tennis/active; ln -s "$previous" /opt/tennis/active; docker compose --project-directory "$previous/deploy" -p tennis-production -f "$previous/deploy/compose.production.yml" up -d --build || true; fi; exit "$code"; }',
      'trap rollback ERR',
      'if ! command -v docker >/dev/null 2>&1; then apt-get update -qq; DEBIAN_FRONTEND=noninteractive apt-get install -y -qq docker.io docker-compose-v2 curl ca-certificates; systemctl enable --now docker; fi',
      'docker compose version >/dev/null',
      `mkdir -p ${shellQuote(`${releaseRoot}/releases`)} ${shellQuote(`${releaseRoot}/backups`)} /etc/tennis`,
      `previous=$(readlink -f ${shellQuote(`${releaseRoot}/active`)} 2>/dev/null || true)`,
      `release=${shellQuote(`${releaseRoot}/releases/${revision}`)}`,
      'mkdir -p "$release"',
      `tar -xzf ${shellQuote(remoteArchive)} -C "$release"`,
      `install -m 600 ${shellQuote(remoteEnv)} /etc/tennis/tennis.env`,
      `if docker volume inspect tennis-production-data >/dev/null 2>&1; then docker run --rm -v tennis-production-data:/var/lib/tennis -v ${shellQuote(`${releaseRoot}/backups`)}:/backups alpine:3.20 sh -c 'if [ -f /var/lib/tennis/tennis.sqlite ]; then cp /var/lib/tennis/tennis.sqlite /backups/tennis.sqlite.before-${revision}; fi'; fi`,
      `rm -f ${shellQuote(`${releaseRoot}/active`)} && ln -s "$release" ${shellQuote(`${releaseRoot}/active`)}`,
      `docker compose --project-directory "$release/deploy" -p tennis-production -f "$release/deploy/compose.production.yml" up -d --build`,
      `for attempt in $(seq 1 30); do if docker compose --project-directory "$release/deploy" -p tennis-production -f "$release/deploy/compose.production.yml" exec -T tennis-app node -e 'fetch("http://127.0.0.1:8787/healthz").then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))'; then break; fi; if [ "$attempt" -eq 30 ]; then exit 1; fi; sleep 1; done`,
      ...(skipPublicCheck ? [] : [`curl --fail --silent --show-error --retry 30 --retry-all-errors --retry-delay 2 --location https://${p.hostname}/healthz >/dev/null`]),
      'trap - ERR',
      `printf '{"schema":"fountain-coach.tennis.deploy-receipt.v2","state":"${skipPublicCheck ? 'prepared' : 'succeeded'}","environment":"production","revision":"${revision}","host":"${p.host}","hostname":"${p.hostname}","url":"https://${p.hostname}/","health":"https://${p.hostname}/healthz","publicReadback":"${skipPublicCheck ? 'skipped' : 'verified'}","release":"%s","rollback":"%s"}\n' "$release" "\${previous:-none}"`,
      `rm -f ${shellQuote(remoteArchive)} ${shellQuote(remoteEnv)}`
    ].join('; ');
    const result = execFileSync('ssh', ['-o', 'BatchMode=yes', '-o', 'ConnectTimeout=10', '-i', p.key,
      `${p.user}@${p.host}`, remote], { encoding: 'utf8' });
    console.log(result.trim());
  } catch (error) {
    console.error(`blocked: production release failed: ${String(error.message || error).replace(/(identity|secret|token|password|key)[^\n]*/gi, '$1=REDACTED').slice(0, 800)}`);
    process.exitCode = 1;
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

switch (command) {
  case 'inspect': inspect(); break;
  case 'plan': console.log(JSON.stringify(plan(), null, 2)); break;
  case 'verify': verify(); break;
  case 'deploy': deploy(); break;
  default:
    console.log('Usage: tennis-deploy <inspect|plan|verify|deploy> [--environment staging|production] [--yes]');
}

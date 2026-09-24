#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(new URL('..', import.meta.url).pathname);
const args = process.argv.slice(2);
const command = args[0] || 'help';
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
    mutation: 'disabled-until-explicit-release-adapter'
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
  console.error('blocked: no native Tennis release adapter is configured for this target');
  process.exitCode = 2;
}

switch (command) {
  case 'inspect': inspect(); break;
  case 'plan': console.log(JSON.stringify(plan(), null, 2)); break;
  case 'verify': verify(); break;
  case 'deploy': deploy(); break;
  default:
    console.log('Usage: tennis-deploy <inspect|plan|verify|deploy> [--environment staging|production] [--yes]');
}

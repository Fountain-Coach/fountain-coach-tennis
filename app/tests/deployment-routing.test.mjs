import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const caddy = readFileSync(new URL('../../deploy/Caddyfile.production', import.meta.url), 'utf8');

assert.match(
  caddy,
  /@dynamic\s+path\s+\/app\*\s+\/auth\*\s+\/oauth\*\s+\/api\*\s+\/mcp\*\s+\/\.well-known\*\s+\/healthz/,
  'dynamic Tennis paths must remain explicitly admitted'
);
assert.match(
  caddy,
  /handle\s+@dynamic\s*\{[\s\S]*?reverse_proxy\s+tennis-app:8787[\s\S]*?\}/,
  'dynamic Tennis paths must stay on the private app service'
);
assert.match(
  caddy,
  /handle\s*\{[\s\S]*?reverse_proxy\s+https:\/\/store\.fountain\.coach\s*\{[\s\S]*?header_up\s+Host\s+tennis\.fountain\.coach[\s\S]*?\}[\s\S]*?\}/,
  'estate/static paths must remain authoritative at the production FountainStore'
);
assert.doesNotMatch(
  caddy,
  /tennis\.fountain\.coach\s*\{\s*encode\s+gzip\s*reverse_proxy\s+tennis-app:8787/s,
  'the public host must not proxy every path to the application'
);

console.log('deployment routing contract: PASS');

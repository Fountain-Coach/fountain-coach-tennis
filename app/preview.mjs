import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve, sep} from 'node:path';

const root = resolve(new URL('.', import.meta.url).pathname);
const teatroRoot = resolve(root, '../../apps/teatro-stage-web/dist');
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'};
const server = createServer(async (request, response) => {
  const pathname = decodeURIComponent((request.url || '/').split('?')[0]);
  const isApp = pathname === '/app' || pathname.startsWith('/app/');
  const isTeatro = !isApp && (pathname === '/teatro' || pathname.startsWith('/teatro/'));
  const relative = (isTeatro ? pathname.replace(/^\/teatro/, '') : isApp ? 'app.html' : pathname).replace(/^\/+/, '') || 'index.html';
  const base = isTeatro ? teatroRoot : root;
  const file = resolve(base, relative);
  if (file !== base && !file.startsWith(base + sep)) { response.writeHead(403); response.end('Forbidden'); return; }
  try {
    const body = await readFile(file);
    response.writeHead(200, {'Content-Type': types[file.slice(file.lastIndexOf('.'))] || 'application/octet-stream'});
    response.end(body);
  } catch { response.writeHead(404, {'Content-Type':'text/plain; charset=utf-8'}); response.end('Not found'); }
});
server.listen(4173, '127.0.0.1', () => console.log('http://127.0.0.1:4173/'));

import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = name => readFile(resolve(root, name), 'utf8');

const html = await read('app.html');
const css = await Promise.all([
  read('src/styles.css'),
  read('src/landing.css'),
  read('src/linotype-utility.css')
]);
const fflate = await read('assets/fflate.js');
const core = (await read('src/tennis-core.js')).replaceAll('export ', '');
const app = (await read('src/tennis.js')).replace(/^import .*?;\n/, '').replaceAll('export ', '');

const output = html
  .replace(/\s*<link rel="stylesheet" href="src\/(styles|landing|linotype-utility)\.css">/g, '')
  .replace(/\s*<script src="assets\/fflate\.js"><\/script><script type="module" src="src\/tennis\.js"><\/script>/g, '')
  .replace('</head>', `<style>\n${css.join('\n')}\n</style>\n</head>`)
  .replace('</body>', `<script>\n${fflate}\n</script>\n<script>\n${core}\n${app}\n</script>\n</body>`);

await writeFile(resolve(root, '../../artifacts/tennis-local.html'), output);

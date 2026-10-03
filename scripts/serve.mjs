import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.md': 'text/plain', '.jpeg': 'image/jpeg', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.png': 'image/png' };
const port = Number(process.env.PORT || 4173);
createServer(async (request, response) => {
  try {
    const path = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    let file = resolve(root, `.${path}`);
    if (!file.startsWith(root + sep) && file !== root) throw new Error('Invalid path');
    if ((await stat(file)).isDirectory()) file = resolve(file, 'index.html');
    const body = await readFile(file);
    response.writeHead(200, { 'Content-Type': `${mime[extname(file)] || 'application/octet-stream'}; charset=utf-8`, 'Cache-Control': 'no-cache' });
    response.end(body);
  } catch { response.writeHead(404, { 'Content-Type': 'text/plain' }); response.end('Not found'); }
}).listen(port, '127.0.0.1', () => console.log(`FTC Controller Mapper: http://127.0.0.1:${port}`));

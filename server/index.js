// index.js — standalone production server: serves the built `dist/` SPA and the
// voice API (/api/tts, /api/stt, /api/health). Run after `npm run build`:
//   node --env-file-if-exists=.env server/index.js
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ttsHandler, sttHandler, healthHandler } from './voiceHandlers.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const DIST = join(__dirname, '..', 'dist');
const PORT = process.env.PORT || 8787;

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.map': 'application/json',
  '.woff': 'font/woff', '.woff2': 'font/woff2',
};

async function serveStatic(url, res) {
  try {
    let p = normalize(join(DIST, url === '/' ? '/index.html' : url));
    if (!p.startsWith(DIST)) { res.writeHead(403); return res.end('Forbidden'); }
    let s;
    try { s = await stat(p); } catch { s = null; }
    if (!s || s.isDirectory()) p = join(DIST, 'index.html'); // SPA fallback
    const data = await readFile(p);
    res.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found — did you run `npm run build`?');
  }
}

const server = http.createServer((req, res) => {
  const url = (req.url || '').split('?')[0];
  if (url === '/api/health' && req.method === 'GET') return healthHandler(req, res);
  if (url === '/api/tts' && req.method === 'POST') return ttsHandler(req, res);
  if (url === '/api/stt' && req.method === 'POST') return sttHandler(req, res);
  return serveStatic(url, res);
});

server.listen(PORT, () => {
  console.log(`CookCircle server on http://localhost:${PORT}`);
  console.log(`  voice providers: ${JSON.stringify({ elevenlabs: !!process.env.ELEVENLABS_API_KEY, sarvam: !!process.env.SARVAM_API_KEY })}`);
});

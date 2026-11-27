import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.join(__dirname, 'dist');
const PORT = Number(process.env.PORT) || 3000;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.wasm': 'application/wasm',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function resolveFilePath(urlPath) {
  let rawPath = '/';
  try {
    rawPath = decodeURIComponent((urlPath || '/').split('?')[0]);
  } catch {
    return null;
  }

  const normalized = path.posix.normalize(rawPath).replace(/^\/+/, '');
  const candidate = path.resolve(DIST_DIR, normalized);
  const rel = path.relative(DIST_DIR, candidate);

  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    return null;
  }

  if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
    return candidate;
  }

  // SPA fallback to index.html for routes without a file extension
  if (!path.extname(normalized)) {
    const fallback = path.join(DIST_DIR, 'index.html');
    if (fs.existsSync(fallback)) return fallback;
  }

  return null;
}

const server = http.createServer((req, res) => {
  const filePath = resolveFilePath(req.url);
  if (!filePath) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  const cacheControl = filePath.includes(`${path.sep}assets${path.sep}`)
    ? 'public, max-age=31536000, immutable'
    : 'public, max-age=0, must-revalidate';

  res.writeHead(200, {
    'Content-Type': contentType,
    'Cache-Control': cacheControl,
  });

  if (req.method === 'HEAD') {
    res.end();
    return;
  }

  fs.createReadStream(filePath).pipe(res);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on http://0.0.0.0:${PORT}`);
  startKeepAlive();
});

// ---------------------------------------------------------------------------
// Self-ping keep-alive (every 3 minutes) — prevents Render free tier sleep
// ---------------------------------------------------------------------------
const PING_INTERVAL_MS = 3 * 60 * 1000; // 3 minutes

function startKeepAlive() {
  // Render exposes the public URL via RENDER_EXTERNAL_URL.
  // You can also set SELF_URL manually in your environment variables.
  const selfUrl =
    process.env.SELF_URL ||
    process.env.RENDER_EXTERNAL_URL ||
    `http://localhost:${PORT}`;

  const pingUrl = selfUrl.replace(/\/$/, '') + '/';

  console.log(`[keep-alive] Self-ping active → ${pingUrl} every 3 min`);

  setInterval(() => {
    const proto = pingUrl.startsWith('https') ? 'node:https' : 'node:http';
    import(proto)
      .then(({ default: mod }) => {
        const req = mod.get(pingUrl, { timeout: 10_000 }, (res) => {
          console.log(`[keep-alive] ping → ${res.statusCode} OK`);
          res.resume();
        });
        req.on('error', (err) => {
          console.warn(`[keep-alive] ping failed: ${err.message}`);
        });
        req.end();
      })
      .catch((err) => {
        console.warn(`[keep-alive] import failed: ${err.message}`);
      });
  }, PING_INTERVAL_MS);
}

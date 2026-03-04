/*========================================================
 server.js — Zero-dependency static file server for Nocturnal.

 Serves dist/ on localhost for local development / preview.

 Supports:
  - Clean URLs: /about → dist/about/index.html
  - Correct MIME types for JS modules (critical for <script type="module">)
  - 404 fallback
==========================================================*/

import http from 'http';
import fs from 'fs';
import path from 'path';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.mjs':  'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.webp': 'image/webp',
  '.ico':  'image/x-icon',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.ttf':  'font/ttf',
};


/**
 * Resolve a request URL to a file path inside distDir.
 * Handles clean URLs and directory index files.
 *
 * @param {string} distDir
 * @param {string} urlPath  - e.g. '/about' or '/components/card.js'
 * @returns {string|null}   - Absolute file path, or null if not found
 */
function resolve(distDir, urlPath) {

  const clean = urlPath.split('?')[0];

  const candidates = [
    path.join(distDir, clean),
    path.join(distDir, clean, 'index.html'),
    path.join(distDir, clean + '.html'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }

  return null;
}


/**
 * Start the static file server.
 *
 * @param {object} config   - Nocturnal config
 * @param {number} port     - Port to listen on (default: 3000)
 * @param {string|null} host - Host to bind (default: null = all interfaces)
 */
export function serve(config, port = 3000, host = null) {

  const root    = config.root || process.cwd();
  const distDir = path.join(root, config.outputDir || 'dist');

  if (!fs.existsSync(distDir)) {
    console.error(`[nocturnal] dist/ not found at ${distDir}`);
    console.error('[nocturnal] Run "nocturnal build" first.');
    process.exit(1);
  }

  const server = http.createServer((req, res) => {
    const filePath = resolve(distDir, req.url);

    if (!filePath) {
      const notFound = path.join(distDir, '404.html');
      if (fs.existsSync(notFound)) {
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(fs.readFileSync(notFound));
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
      }
      return;
    }

    const ext      = path.extname(filePath).toLowerCase();
    const mimeType = MIME[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': mimeType });
    fs.createReadStream(filePath).pipe(res);
  });

  const listenCb = () => {
    const hostLabel = host || 'localhost';
    console.log(`[nocturnal] Serving dist/ at http://${hostLabel}:${port}`);
    console.log(`[nocturnal] Env: ${config.env || 'dev'}  |  baseURL: ${config.baseURL || '/'}`);
    console.log('[nocturnal] Ctrl+C to stop\n');
  };

  if (host) {
    server.listen(port, host, listenCb);
  } else {
    server.listen(port, listenCb);
  }

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`[nocturnal] Port ${port} in use, trying ${port + 1}...`);
      serve(config, port + 1, host);
    } else {
      console.error('[nocturnal] Server error:', err.message);
      process.exit(1);
    }
  });

  return server;
}

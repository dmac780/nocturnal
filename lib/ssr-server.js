/**
 * ssr-server.js — SSR-enabled HTTP server for Nocturnal
 * Renders pages on-demand using the same renderer as SSG build
 * 
 * When config.ssr = true:
 *  - HTML pages are rendered at request time
 *  - Static assets (CSS, JS, components) are served from src/ and node_modules/
 *  - Same renderPage() logic as SSG, but executed per-request
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { pathToFileURL } from 'url';
import { loadEnv } from './env.js';
import { renderPage, parseFrontmatter } from './renderer.js';
import { processSSRComponents } from './ssr-renderer.js';
import { minifySource, minifyJS } from './minifier.js';
import { handleAPIRoute } from './ssr-api.js';
import { getCorsHeaders } from './cors.js';
import { green, red, yellow } from './console-colors.js';

/** MIME types that benefit from text compression */
const COMPRESSIBLE_MIME = new Set([
  'text/html', 'text/css', 'application/javascript', 'application/json',
  'text/plain', 'text/xml', 'application/xml', 'image/svg+xml'
]);


/**
 * Get the accepted encoding from the request headers.
 * @param {http.IncomingMessage} req 
 * @returns {string|null}
 */
function getAcceptedEncoding(req) {

  const ae = (req.headers['accept-encoding'] || '').toLowerCase();

  if (ae.includes('br')) {
    return 'br';
  }

  if (ae.includes('gzip')) {
    return 'gzip';
  }

  return null;
}


/**
 * Send a compressed response.
 * used for text-compression of HTML, CSS, and JS files for faster delivery
 * https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Encoding
 * 
 * @param {http.ServerResponse} res 
 * @param {number} statusCode 
 * @param {Record<string, string>} headers 
 * @param {string} body 
 * @param {string} encoding 
 */
function sendCompressed(res, statusCode, headers, body, encoding) {
  
  const buf = Buffer.isBuffer(body) ? body : Buffer.from(body, 'utf8');

  // try catch around this ?????????
  const compressed = encoding === 'br'
    ? zlib.brotliCompressSync(buf, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 4 } })
    : zlib.gzipSync(buf, { level: 6 });

  const h = { ...headers, 'Content-Encoding': encoding, 'Vary': 'Accept-Encoding' };

  res.writeHead(statusCode, h);
  res.end(compressed);
}


/**
 * Extract the script body from the HTML.
 * <script data-island-extract>...</script>
 * 
 * @param {string} html 
 * @returns {string|null}
 */
function extractIslandScript(html) {

  const re = /<script\s[^>]*data-island-extract[^>]*>([\s\S]*?)<\/script>/i;
  const m  = html.match(re);

  return m ? m[1].trim() : null;
}


/**
 * Build merged islands code (runtime + map) for SSR.
 * Returns the merged JavaScript code that will be inlined into HTML.
 *
 * @param {string} patternsDir
 * @param {object} config
 * @returns {string}
 */
function buildMergedIslandsCode(patternsDir, config) {

  const pkgRootDir  = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
  const packageRoot = config.packageRoot || pkgRootDir;
  
  //const packageRoot    = config.packageRoot || path.join(path.dirname(new URL(import.meta.url).pathname), '..');
  const islandsSrcPath = path.join(packageRoot, 'lib', 'islands.js');

  if (!fs.existsSync(islandsSrcPath)) {
    console.warn(`[nocturnal/ssr] ${yellow('islands.js not found')}, skipping island hydration`);
    return '';
  }
  
  const minify = config.minify || {};
  const shouldMinify = minify.js === true;
  
  // Read the islands.js runtime
  let islandsRuntime = fs.readFileSync(islandsSrcPath, 'utf8');
  
  // Strip export keywords since we'll inline this
  islandsRuntime = islandsRuntime.replace(/export function /g, 'function ');
  
  // Extract island scripts from patterns
  if (!fs.existsSync(patternsDir)) return islandsRuntime;
  
  const islandEntries = [];
  const entries = fs.readdirSync(patternsDir, { withFileTypes: true });
  for (const e of entries) {
    if (!e.isFile() || !e.name.endsWith('.html')) continue;
    const htmlFile = path.join(patternsDir, e.name);
    const raw = fs.readFileSync(htmlFile, 'utf8');
    const { data: fm, content } = parseFrontmatter(raw);
    if (fm.hydrate !== true) continue;
    const scriptBody = extractIslandScript(content);
    if (!scriptBody) continue;
    const baseName = path.basename(htmlFile, '.html');
    const islandName = fm.island || baseName;
    islandEntries.push({ name: islandName, body: scriptBody });
  }
  
  // Build island entries (minified body) for per-page filtering; renderer injects only islands on each page
  const entriesWithBody = islandEntries.map(({ name, body }) => {
    let minifiedBody = body;
    if (shouldMinify) {
      minifiedBody = minifyJS(body)
        .replace(/\n+/g, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim();
    }
    return { name, body: minifiedBody };
  });

  global.__nocturnalIslandEntries = entriesWithBody;
  global.__nocturnalIslandsRuntime = islandsRuntime;

  const scriptMapLines = entriesWithBody.length > 0
    ? entriesWithBody.map(({ name, body }) => `  ${JSON.stringify(name)}: () => Promise.resolve(new Function(${JSON.stringify(body)})())`)
    : [];

  const islandMapCode = `\n/* Island map - auto-generated for SSR */\nconst islandMap = {\n${scriptMapLines.join(',\n')}\n};\n\n/* Auto-hydrate */\nif (Object.keys(islandMap).length > 0) {\n  hydrateIslands(islandMap);\n}\n`;

  let mergedCode = islandsRuntime + islandMapCode;
  
  // Minify the merged code
  if (shouldMinify) {
    mergedCode = minifyJS(mergedCode)
      .replace(/\n+/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }
  
  return mergedCode;
}

/**
 * Build lazy partials from patterns only (source of truth: noc-reveal + noc-pattern src).
 * Writes to src/partials/ only — never repo root.
 * Called once at server startup. Islands.js fetches these on demand.
 */
function buildLazySectionsPartials(root, patternsDir, partialsDir, config) {
  if (!fs.existsSync(patternsDir)) return;
  
  fs.mkdirSync(partialsDir, { recursive: true });

  const entries = fs.readdirSync(patternsDir, { withFileTypes: true });
  for (const e of entries) {
    if (!e.isFile() || !e.name.endsWith('.html')) continue;
    const htmlFile = path.join(patternsDir, e.name);
    const raw = fs.readFileSync(htmlFile, 'utf8');
    const { data: fm, content } = parseFrontmatter(raw);
    
    // Only process patterns with lazy-html: true
    if (fm['lazy-html'] !== true) continue;
    
    const baseName = path.basename(htmlFile, '.html');
    
    // Render the pattern body (same logic as renderer's inlineStaticPatterns)
    // For SSR we just write the raw pattern body (with islands wrapper if hydrate: true)
    let body = content.trim();
    
    // Strip styles (they're already in the main page head)
    body = body.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
    
    if (fm.hydrate === true) {
      // Strip island scripts (already in island-build.js)
      body = body.replace(/<script\s[^>]*data-island-extract[^>]*>[\s\S]*?<\/script>/gi, '').trim();
      const islandName = fm.island || baseName;
      const strategy = fm.strategy || 'client:load';
      body = `<div data-island="${islandName}" data-strategy="${strategy}">\n${body}\n</div>`;
    }
    
    const partialFile = path.join(partialsDir, `${baseName}.html`);
    fs.writeFileSync(partialFile, body, 'utf8');
    console.log(`[nocturnal/ssr] ${green('✓')}  src/partials/${baseName}.html (from pattern)`);
  }
}

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
 * Map a URL route to a source page file.
 * 
 * /              → src/pages/index.html
 * /about         → src/pages/about.html
 * /blog/hello    → src/pages/blog/hello.html
 * 
 * @param {string} pagesDir
 * @param {string} urlPath
 * @returns {string|null}
 */
function routeToPageFile(pagesDir, urlPath) {
  const clean = urlPath.split('?')[0];
  
  // Root
  if (clean === '/') {
    const index = path.join(pagesDir, 'index.html');
    return fs.existsSync(index) ? index : null;
  }
  
  // Remove leading slash
  const routePath = clean.slice(1);
  
  const candidates = [
    path.join(pagesDir, routePath + '.html'),           // /about → about.html
    path.join(pagesDir, routePath, 'index.html'),       // /blog → blog/index.html
    path.join(pagesDir, routePath + '/index.html'),     // /blog/ → blog/index.html
  ];
  
  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }
  
  return null;
}

/**
 * Resolve static assets (JS, CSS, fonts, etc.) from various locations.
 * 
 * /components/custom-card.js     → src/components/custom-card.js
 * /nocturnal-components/...       → node_modules/nocturnal-components/...
 * /public/css/style.css          → src/public/css/style.css
 * /islands.js                    → islands.js (for fallback; normally inlined)
 * /partials/install-tree.html    → partials/install-tree.html (lazy sections)
 * 
 * @param {string} root - Project root
 * @param {string} urlPath
 * @returns {string|null}
 */
function resolveAsset(root, urlPath) {
  const clean = urlPath.split('?')[0];
  
  const candidates = [
    path.join(root, 'src', clean),                    // src/public/... or src/components/...
    path.join(root, 'node_modules', clean),           // node_modules/lunadom/...
    path.join(root, clean),                           // islands.js, lazy-sections.js, partials/..., etc.
  ];
  
  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }
  
  return null;
}

/**
 * Start SSR-enabled server.
 * Renders HTML pages on-demand, serves static assets from src/ and node_modules/.
 *
 * @param {object} config - Nocturnal config
 * @param {number} port - Port to listen on (default: 3000)
 * @param {string|null} host - Host to bind (default: null = all interfaces)
 */
export function serveSSR(config, port = 3000, host = null) {
  const root = config.root || process.cwd();

  loadEnv(root);

  const pagesDir = path.join(root, 'src', 'pages');
  const layoutsDir = path.join(root, 'src', 'layouts');
  const patternsDir = path.join(root, 'src', 'patterns');

  if (!fs.existsSync(pagesDir)) {
    console.error(`[nocturnal] ${red('src/pages/ not found')} at ${pagesDir}`);
    console.error('[nocturnal] Run "noc create" first.');
    process.exit(1);
  }

  // Build merged islands code and store globally for renderer
  const mergedIslandsCode = buildMergedIslandsCode(patternsDir, config);
  global.__nocturnalMergedIslandsCode = mergedIslandsCode;
  if (mergedIslandsCode) {
    console.log(`[nocturnal/ssr] ${green('✓')}  Islands code merged (will be inlined in HTML)`);
  }

  // Build lazy partials from patterns (source of truth); write to src/partials/ only
  const lazyPartialsDir = path.join(root, 'src', 'partials');
  buildLazySectionsPartials(root, patternsDir, lazyPartialsDir, config);

  const server = http.createServer(async (req, res) => {
    const urlPath = req.url;
    const useCompression = config.compress !== false;
    const encoding = useCompression ? getAcceptedEncoding(req) : null;

    if (req.method === 'OPTIONS' && urlPath.startsWith('/api/') && config.apiCors) {
      const corsHeaders = getCorsHeaders(req, config.apiCors);
      res.writeHead(204, corsHeaders);
      res.end();
      return;
    }

    const apiHandled = await handleAPIRoute(root, urlPath, req, res, { cors: config.apiCors });

    if (apiHandled) {
      return;
    }
    
    // Try to resolve as a page route (HTML)
    const pageFile = routeToPageFile(pagesDir, urlPath);
    
    if (pageFile) {
      try {
        const currentRoute = urlPath.split('?')[0];
        
        const result = await renderPage(pageFile, {
          layoutsDir,
          patternsDir,
          baseURL: config.baseURL || '/',
          userConfig: config,
          currentRoute,
          rootDir: root,
        });
        
        // Handle both old string return and new object return
        let html = typeof result === 'string' ? result : result.html;
        
        // Inject declarative shadow DOM for components that export ssrTemplate
        if (config.ssr) {
          html = await processSSRComponents(html, root, 'ssr');
          // Inject render mode meta tag so client-side components can read it
          html = html.replace('<head>', '<head>\n  <meta name="nocturnal-render" content="ssr">');
        }
        
        const ctype = 'text/html; charset=utf-8';
        if (encoding) {
          sendCompressed(res, 200, { 'Content-Type': ctype }, html, encoding);
        } else {
          res.writeHead(200, { 'Content-Type': ctype });
          res.end(html);
        }
        console.log(`[nocturnal/ssr] ${green('200')} ${urlPath}`);
        return;
        
      } catch (err) {
        console.error(`[nocturnal/ssr] ${red('Failed')} to render ${urlPath}:`, err.message);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('500 Internal Server Error');
        return;
      }
    }
    
    // Try to resolve as static asset (JS, CSS, etc.)
    const assetPath = resolveAsset(root, urlPath);
    
    if (assetPath) {
      const ext      = path.extname(assetPath).toLowerCase();
      const mimeType = MIME[ext] || 'application/octet-stream';
      const minify   = config.minify || {};
      const shouldMinify = (minify.css && ext === '.css') || (minify.js && (ext === '.js' || ext === '.mjs'));
      const compressible = COMPRESSIBLE_MIME.has(mimeType.split(';')[0].trim());

      // Long-lived cache for static assets (Lighthouse "efficient cache lifetimes")
      const staticAsset = ['.js', '.mjs', '.css', '.woff', '.woff2', '.ttf', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico'].includes(ext);
      const headers = { 'Content-Type': mimeType };
      if (staticAsset) headers['Cache-Control'] = 'public, max-age=31536000, immutable';

      if (shouldMinify) {
        try {
          const src = fs.readFileSync(assetPath, 'utf8');
          const out = minifySource(src, assetPath, { css: minify.css, js: minify.js });
          if (encoding && compressible) {
            sendCompressed(res, 200, headers, out, encoding);
          } else {
            res.writeHead(200, headers);
            res.end(out);
          }
          return;
        } catch (err) {
          console.warn(`[nocturnal] ${yellow('Minify failed')} for ${urlPath}, serving raw: ${err.message}`);
        }
      }

      if (encoding && compressible) {
        headers['Content-Encoding'] = encoding;
        headers['Vary'] = 'Accept-Encoding';
        res.writeHead(200, headers);
        const stream = fs.createReadStream(assetPath);
        const compressor = encoding === 'br'
          ? zlib.createBrotliCompress({ params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 4 } })
          : zlib.createGzip({ level: 6 });
        stream.pipe(compressor).pipe(res);
      } else {
        res.writeHead(200, headers);
        fs.createReadStream(assetPath).pipe(res);
      }
      return;
    }
    
    // 404
    const notFoundPage = path.join(pagesDir, '404.html');
    if (fs.existsSync(notFoundPage)) {
      try {
        const result = await renderPage(notFoundPage, {
          layoutsDir,
          patternsDir,
          baseURL: config.baseURL || '/',
          userConfig: config,
          currentRoute: urlPath,
          rootDir: root,
        });
        const html = typeof result === 'string' ? result : result.html;
        const ctype = 'text/html; charset=utf-8';
        if (encoding) {
          sendCompressed(res, 404, { 'Content-Type': ctype }, html, encoding);
        } else {
          res.writeHead(404, { 'Content-Type': ctype });
          res.end(html);
        }
      } catch (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
      }
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
    }
    
    console.log(`[nocturnal/ssr] ${yellow('404')} ${urlPath}`);
  });

  server.listen(port, () => {
    console.log(`[nocturnal] ${green('SSR server running')} at http://localhost:${port}`);
    console.log(`[nocturnal] Env: ${config.env || 'dev'}  |  baseURL: ${config.baseURL || '/'}`);
    console.log('[nocturnal] Pages rendered on-demand (SSR mode)');
    console.log('[nocturnal] Ctrl+C to stop\n');
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`[nocturnal] ${yellow('Port')} ${port} in use, trying ${port + 1}...`);
      serveSSR(config, port + 1);
    } else {
      console.error(`[nocturnal] ${red('Server error')}:`, err.message);
      process.exit(1);
    }
  });

  // Watch src/config.js and restart server on change
  const configPath = path.join(root, 'src', 'config.js');
  if (fs.existsSync(configPath)) {
    let debounceTimer;
    fs.watch(configPath, () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(async () => {
        console.log('[nocturnal] src/config.js changed — reloading config and restarting server...');
        server.close();
        try {
          // Bust the module cache by appending a timestamp query
          const { default: newConfig } = await import(`${pathToFileURL(configPath).href}?t=${Date.now()}`);
          const merged = { ...config, ...newConfig };
          if (newConfig.environments?.[merged.env]) {
            Object.assign(merged, newConfig.environments[merged.env]);
          }
          const reloadPort = merged.devServer?.port ?? port;
          const reloadHost = merged.devServer?.host ?? host;
          serveSSR(merged, reloadPort, reloadHost);
          console.log(`[nocturnal] ${green('✓')} Server restarted with new config`);
        } catch (err) {
          console.error(`[nocturnal] ${red('Failed')} to reload config:`, err.message);
          serveSSR(config, port, host); // fallback to old config
        }
      }, 300);
    });
    console.log('[nocturnal] Watching src/config.js for changes...');
  }

  return server;
}

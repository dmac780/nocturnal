/*========================================================
 watcher.js — Dev mode file watcher for Nocturnal

 Uses native fs.watch (recursive) — zero dependencies.
==========================================================*/

import fs from 'fs';
import path from 'path';
import { build } from './builder.js';


/**
 * Debounce a function so rapid sequential calls collapse into one.
 * @param {Function} fn
 * @param {number} delay - ms
 */
function debounce(fn, delay = 150) {
  
  let timer;

  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}


/**
 * Start watching src/ and trigger a full rebuild on any change.
 * Also starts the dev server.
 * Returns the fs.FSWatcher instance.
 *
 * @param {object} config - Nocturnal config
 * @param {number} port - Server port (default: 3000)
 * @param {string|null} host - Host to bind (default: null = all interfaces)
 * @returns {fs.FSWatcher}
 */
export function watch(config, port = 3000, host = null) {

  const root   = config.root || process.cwd();
  const srcDir = path.join(root, 'src');

  if (!fs.existsSync(srcDir)) {
    console.error(`[nocturnal] src/ directory not found at ${srcDir}`);
    console.error('[nocturnal] Run "nocturnal create" first.');
    process.exit(1);
  }

  console.log(`[nocturnal] Watching ${srcDir} for changes...\n`);

  build(config).then(() => {
    if (config.ssr) {
      import('./ssr-server.js').then(({ serveSSR }) => {
        serveSSR(config, port, host);
      });
    } else {
      import('./server.js').then(({ serve }) => {
        serve(config, port, host);
      });
    }
  }).catch(console.error);

  const rebuild = debounce((eventType, filename) => {
    // fs.watch passes (eventType, filename); filename can be null on some systems
    const name = filename != null ? filename.replace(/\\/g, '/') : '';
    // Ignore changes under src/partials/ (build output — would cause infinite rebuild loop)
    if (name.startsWith('partials/') || name === 'partials') {
      return;
    }

    const label = filename != null ? path.relative(root, path.join(srcDir, filename)) : 'src/';
    console.log(`[nocturnal] Changed: ${label} — rebuilding...`);

    build(config).catch(console.error);
  }, 150);

  const watcher = fs.watch(srcDir, { recursive: true }, rebuild);

  watcher.on('error', (err) => {
    console.error('[nocturnal] Watcher error:', err.message);
  });

  return watcher;
}

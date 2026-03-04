/*========================================================
  index.js — Nocturnal public API

  Exports core primitives for programmatic use or SSR
==========================================================*/

export { build } from './builder.js';

export { watch } from './watcher.js';

export { renderPage,
         resolveComponentPath,
         buildPreloadTags,
         buildFaviconTags,
         resolvePatterns,
         applyLayout,
         renderTemplate
        } from './renderer.js';

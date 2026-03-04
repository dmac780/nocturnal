/**
 * bootstrap-naked.js — Minimal scaffold for "nocturnal create naked"
 * Empty starter project with just the essential structure
 */

export const templates = {
  '.env.example': `# Copy to .env and set values. In prod, set vars on your host (e.g. AWS, Vercel).
# Nocturnal loads .env only when a key is not already set; host env wins.
NODE_ENV=development
# DATABASE_URL=
# API_KEY=
`,

  // User site configuration
  'src/config.js': `/* 
 * User configuration for your site 
 * Assets in src/public/ are isolated from core installation
 * refer to docs/README_ASSETS.md for full documentation
 */
export default {

  // ==================================================
  // > SITE METADATA <
  // ==================================================
  title: 'My Nocturnal Site',
  description: 'A lightweight SSG framework for native Web Components',
  keywords: ['web components', 'SSG', 'Nocturnal'],
  author: 'Your Name',
  url: 'https://example.com',
  

  // ==================================================
  // > DISTRIBUTION DIRECTORY <
  // ==================================================
  // directory to build the project to (default: 'dist')
  // --------------------------------------------------
  outputDir: 'dist',


  // ==================================================
  // > BASE URL MANAGEMENT <
  // ==================================================
  // Base URL prefix for all asset paths (modulepreload hrefs, etc.)
  // localhost:3000 -> /(baseURL)
  // --------------------------------------------------
  baseURL: '/',


  // ==================================================
  // > ENVIRONMENTS <
  // ==================================================
  // overrides baseURL per environment
  // serve different baseURLs for different environments
  //   noc build --env dev
  //   noc build --env prod
  //   noc build --env stage
  // localhost:3000 -> /(envURL)/ -> /(baseURL)
  // --------------------------------------------------
  environments: {
    dev:   { baseURL: '/' },
    prod:  { baseURL: '/' },
    stage: { baseURL: '/' },
  },


  // ==================================================
  // > SERVER-SIDE RENDERING (SSR) <
  // ==================================================
  // Optional: enable server-side rendering
  // Make sure to re-build the project after enabling/disabling SSR.
  // --------------------------------------------------
  ssr: false,


  // ==================================================
  // > HYDRATION MANAGEMENT <
  // ==================================================
  // Optional: enable island hydration
  // nocturnal runtime loads the {islands.js, island-build.js} scripts and hydrates patterns with JS behavior. 
  // Custom elements run their connectedCallback, so you get the JS behavior (sheen, tooltip, counters, etc.).
  // You want to turn hydrateIslands to false when: 
  //   - Not using patterns in project.
  //
  // Islands can also lazy-load HTML content (lazy-html: true in pattern frontmatter):
  //   - Reduces initial page weight by deferring HTML until the island hydrates
  //   - Islands.js fetches /partials/<pattern>.html when the island's strategy triggers
  //------------------------------------------------
  hydrateIslands: true,


  // ==================================================
  // > DEV SERVER (serve / watch) <
  // ==================================================
  // Port and optional host for noc serve and noc watch. CLI --port overrides when provided.
  // --------------------------------------------------
  devServer: {
    port: 3000,
    // host: 'localhost',
  },


  // ==================================================
  // > MINIFICATION MANAGEMENT <
  // ==================================================
  // Optional: minify assets on build (noc build)
  // css: minifies all .css files (components, public, nocturnal-components)
  // js:  minifies all .js/.mjs files — strips comments + whitespace,
  //      preserves string literals, template literals, and CSS custom properties
  minify: {
    css: true,
    js:  true,
  },
  

  // ==================================================
  // > COMPRESSION - SSR ONLY <
  // ==================================================
  // Optional: compress assets on build (noc build)
  // gzip: compress .html, .css, .js, .mjs files
  // br: compress .html, .css, .js, .mjs files
  // --------------------------------------------------
  compress: true,


  // ==================================================
  // > API CORS (SSR only) <
  // ==================================================
  // When API is called from another origin,
  // set apiCors so the browser allows it. 
  // true = *; or { origin, methods, allowHeaders, credentials }
  // --------------------------------------------------
  // apiCors: true,


  // ==================================================
  // > CSS STYLESHEETS MANAGEMENT <
  // ==================================================
  // position: 'critical' → {{criticalPath}} - above {{headExtras}}
  // position: 'head'     → injected into {{headExtras}} before </head>
  // position: 'body'     → injected into {{bodyExtras}} before </body>
  // -------------------------
  // routes: '*'       → all pages
  // routes: '/about'  → only the /about page
  // routes: '/blog/*' → /blog and any path under it
  // -------------------------
  // rel: 'preload'    → preload the stylesheet
  // rel: 'stylesheet' → load the stylesheet
  // -------------------------
  // as: 'style' → resource hint for preload (e.g. 'style')
  // -------------------------
  // inline: true/false → inline the stylesheet into the <style> tag (default: false)
  // -------------------------
  // attrs: { crossorigin: 'anonymous' } → add custom HTML attributes to the <link> tag
  // -------------------------
  styles: [
    {
      href: '/public/css/style.css',
      routes: '*',
      rel: 'stylesheet',
      position: 'head',
      inline: true,
    },
  ],


  // ==================================================
  // > CSS STYLESHEETS MANAGEMENT <
  // ==================================================
  // JavaScript assets - loaded per-route with flexible options.
  // position: 'head' → injected into {{headExtras}} (before </head>)
  // position: 'body' → injected into {{bodyExtras}} (before </body>)
  // Default position is 'head' if omitted.
  // --------------------------------------------------
  scripts: [
    {
      src: '/public/js/main.js',
      routes: '*',
      position: 'body',
      type: 'module',
      inline: true,
    },
  ],


  // ==================================================
  // > FONTS MANAGEMENT <
  // ==================================================
  // Fonts are loaded per-route with flexible options.
  // position: 'head' → injected into {{headExtras}} (before </head>)
  // position: 'body' → injected into {{bodyExtras}} (before </body>)
  // Default position is 'head' if omitted.
  // --------------------------------------------------
  /*
   * {
   *   href: '/public/fonts/inter.woff2',
   *   routes: '*',
   *   rel: 'preload',
   *   as: 'font',
   *   attrs: { type: 'font/woff2', crossorigin: 'anonymous' },
   * }
   */


  // ==================================================
  // > FAVICON MANAGEMENT <
  // ==================================================
  // The favicon to use for the site
  // ==================================================
  // > FAVICON & PWA MANIFEST <
  // ==================================================
  // Optional: favicon and web app manifest
  // Set paths to your favicon files.
  // Leave empty or omit any format you don't have.
  // Only non-empty paths will be injected into the HTML.
  // Injected into {{criticalPath}} — loads before everything else.
  // https://favicon.io/ — generate all formats at once
  // --------------------------------------------------
  favicon: {
    enabled: false,

    // Modern browsers: SVG (recommended, scales to any size)
    svg: '/public/assets/favicon.svg',

    // Mobile & fallback: PNG (recommended: 192x192 or larger)
    png: '/public/assets/favicon.png',

    // Legacy browsers: ICO (optional, only needed for IE/old browsers)
    ico: '/public/favicon.ico',

    // Apple touch icon (optional, recommended for iOS home screen)
    appleTouchIcon: '/public/assets/apple-touch-icon.png',

    // PWA manifest: point to your manifest.json file in src/public/
    // Create and manage manifest.json manually — Nocturnal just links it.
    manifest: {
      enabled: false,
      path: '/public/manifest.json',
      themeColor: '#000000',
    },
  },


};
`,

  // Minimal default layout
  'src/layouts/default.html': `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{title}}</title>
    <meta name="description" content="{{description}}">
    {{criticalPath}}
    {{headExtras}}
  </head>
  <body>
    {{content}}
    {{bodyExtras}}
    {{islandScript}}
  </body>
</html>
`,

  // Empty homepage
  'src/pages/index.html': `---
layout: default
title: Home
description: Welcome to my site this is my meta description
components: []
---

<main>
  <h1>NOCTURNAL</h1>
  <p>enjoy your stay</p>
</main>
`,

  // Minimal 404 page
  'src/pages/404.html': `---
layout: default
title: 404 - Page Not Found
description: The page you're looking for doesn't exist.
components: []
---

<main>
  <h1>404</h1>
  <p>Page not found</p>
  <p><a href="/">← Home</a></p>
</main>
`,

  // Empty stylesheet
  'src/public/css/style.css': `/* Add your styles here */

:root {
  --bg: #000000;
  --text: #999999;
}

body {
  margin: 0;
  font-family: ui-monospace, "Cascadia Code", "Source Code Pro", Menlo, monospace;
  background: var(--bg);
  color: var(--text);
}

main {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
}
`,

  // Minimal JS with hydration confirmation comment
  'src/public/js/main.js': `// Hydration confirmed: JS is loaded and running
`,
};

/**
 * Directory structure to create (same as demo)
 */
export const directories = [
  'src/pages',
  'src/layouts',
  'src/patterns',
  'src/api',
  'src/components',
  'src/public/css',
  'src/public/js',
  'src/public/assets',
  'src/partials',
];

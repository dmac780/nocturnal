/**
 * bootstrap.js — Scaffold templates for "nocturnal create"
 * Contains all the default files and structure for a new Nocturnal project
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
    {
      src: '/public/js/theme-init.js',
      routes: '*',
      position: 'head',
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

  // Default layout with proper injection points
  'src/layouts/default.html': `<!DOCTYPE html>
<html lang="en" data-accent="pink" data-theme="dark">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{title}}</title>
    <meta name="description" content="{{description}}">
    {{criticalPath}}
    {{headExtras}}
  </head>
  <body>
    <noc-pattern src="nav" />
    {{content}}
    {{bodyExtras}}
    {{islandScript}}
    <noc-pattern src="footer" />
  </body>
</html>
`,

  // Hydrated badge custom component
  'src/components/hydrated-badge.js': `/**
 * Hydrated Badge template
 * Example badge to show hydration status of SSR and SSG.
 */
function template(label) {
  const value = label != null && label !== '' ? String(label) : 'SSG Fallback';
  return \`
    <style>
      :host { display: inline-block; }
      .badge {
        position: relative;
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        padding: 0.25rem 0.6rem;
        font-size: 0.75rem;
        font-weight: 600;
        color: var(--accent);
        background: color-mix(in srgb, var(--accent) 12%, transparent);
        border: 1px solid color-mix(in srgb, var(--accent) 35%, transparent);
        border-radius: 6px;
        font-family: inherit;
        overflow: hidden;
      }
      .dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: currentColor;
        animation: pulse 1.5s ease-in-out infinite;
      }
      .sheen {
        position: absolute;
        inset: 0;
        background: linear-gradient(105deg,
                                    transparent 0%,
                                    color-mix(in srgb, var(--text-primary) 22%, transparent) 45%,
                                    color-mix(in srgb, var(--text-primary) 22%, transparent) 50%,
                                    color-mix(in srgb, var(--text-primary) 22%, transparent) 55%,
                                    transparent 100%);
        background-size: 200% 100%;
        opacity: 0;
        pointer-events: none;
      }
      .badge.hydrated .sheen {
        animation: sheen 1.5s ease-out forwards;
        animation-iteration-count: infinite;
      }
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.4; }
      }
      @keyframes sheen {
        0% { opacity: 0; background-position: 200% 0; }
        50% { opacity: 1; }
        100% { opacity: 0; background-position: -200% 0; }
      }
    </style>
    <span class="badge" role="status" aria-label="\${value ? \`Badge: \${value}\` : 'Badge'}">
      <span class="sheen" aria-hidden="true"></span>
      <span class="dot" aria-hidden="true"></span>
      <slot><span class="slot-default">\${value}</span></slot>
    </span>
  \`;
}

class HydratedBadge extends HTMLElement {

  constructor() {
    super();
    // Only attach a new shadow root if DSD hasn't already created one
    if (!this.shadowRoot) {
      this.attachShadow({ mode: 'open' });
    }
  }

  connectedCallback() {
    const renderMode = document.querySelector('meta[name="nocturnal-render"]')?.getAttribute('content') || 'ssg';
    const label = renderMode === 'ssr' ? 'SSR — Hydrated' : 'SSG — Hydrated';
    this.shadowRoot.innerHTML = template(label);
    this.shadowRoot.querySelector('.badge')?.classList.add('hydrated');
    this.setAttribute('label', label);
    this.textContent = label;
  }
}

customElements.define('hydrated-badge', HydratedBadge);

export function ssrTemplate(attrs = {}) {
  return \`<template shadowrootmode="open">\${template('DSD Fallback')}</template>\`;
}
`,

  // Theme switcher custom component
  'src/components/theme-switcher.js': `/**
 * Theme switcher — toggles data-theme on <html> (dark | light). Persists to localStorage.
 */

const STORAGE_KEY = 'noc-theme';

function getTheme() {
  if (typeof localStorage !== 'undefined') {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'dark' || stored === 'light') return stored;
  }
  return 'dark';
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, theme);
}

function template(currentTheme) {
  const icon = currentTheme === 'dark' ? '☀' : '☾';
  const ariaLabel = currentTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
  return \`
    <style>
      :host { display: inline-block; }
      button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 2rem;
        height: 2rem;
        padding: 0;
        font-size: 1.1rem;
        line-height: 1;
        font-family: inherit;
        color: var(--text-secondary, #888);
        background: var(--bg-hover, rgba(255,255,255,0.06));
        border: 1px solid var(--border-subtle, #333);
        border-radius: 0.375rem;
        cursor: pointer;
      }
      button:hover {
        color: var(--text-primary, #ccc);
        background: var(--bg-active, rgba(255,255,255,0.1));
        border-color: var(--border-default, #444);
      }
    </style>
    <button type="button" aria-label="\${ariaLabel}">
      <span class="icon">\${icon}</span>
    </button>
  \`;
}

class ThemeSwitcher extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    const theme = getTheme();
    applyTheme(theme);
    this.shadowRoot.innerHTML = template(theme);
    this.shadowRoot.querySelector('button').addEventListener('click', () => {
      const next = getTheme() === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      const iconEl = this.shadowRoot.querySelector('.icon');
      const btn = this.shadowRoot.querySelector('button');
      if (iconEl) iconEl.textContent = next === 'dark' ? '☀' : '☾';
      if (btn) btn.setAttribute('aria-label', next === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    });
  }
}

customElements.define('theme-switcher', ThemeSwitcher);

export function ssrTemplate(attrs = {}) {
  const theme = attrs.theme === 'light' ? 'light' : 'dark';
  return \`<template shadowrootmode="open">\${template(theme)}</template>\`;
}
`,

  // Homepage
  'src/pages/index.html': `---
layout: default
title: Home
description: This is the home page.
components:
  - @user:hydrated-badge
  - @core:tooltip
  - @core:copy-button
  - @core:divider
  - @core:card
  - @core:radar-chart
  - @core:sparkline
  - @core:reveal
  - @core:code
---
<main>

  <noc-pattern src="hero" />

  <noc-divider variant="gradient" style="--noc-divider-color: var(--border-subtle);"></noc-divider>

  <section aria-labelledby="features-heading">
    <div class="features-grid">
      <noc-card full-height overflow-visible size="100%">
        <span slot="header">50+ web components</span>
        <noc-radar-chart
          full-width
          lockable
          title="Class Breakdown - Radar Chart"
          data='[
            {"label": "Strength"},
            {"label": "Speed"},
            {"label": "Magic"},
            {"label": "Health"},
            {"label": "Defense"},
            {"label": "Luck"}
          ]'
          series='[
            {"label": "Warrior", "color": "#2563eb", "data": [100, 40, 51, 75, 95, 45]},
            {"label": "Mage", "color": "#22c55e", "data": [50, 60, 100, 90, 50, 70]},
            {"label": "Archer", "color": "#ffa500", "data": [74, 100, 65, 53, 65, 90]}
          ]'
        ></noc-radar-chart>
      </noc-card>
      <noc-card full-height size="100%">
        <span slot="header">native hydration</span>
        <code>client:load</code> hydrates immediately on page load<br><br>
        <code>client:visible</code> - hydrates when the component is visible<br><br>
        <code>client:idle</code> - hydrates when the main thread is free (requestIdleCallback)
      </noc-card>
      <noc-card full-height size="100%">
        <span slot="header">build & serve</span>
        <p>optimize asset delivery, serve static or run SSR.</p>
        <p><noc-sparkline 
          data='[5 10 8 15 12 18 20]'
          trend="positive"
          style="
            --noc-sparkline-width: 2;
            --noc-sparkline-radius: 2;
            --noc-sparkline-padding: 2;
            --noc-sparkline-margin: 2;
            --noc-sparkline-font-size: 12px;
          ">
        </noc-sparkline> faster pages</p><br>
        <p>
          <noc-sparkline
          data='[100, 95, 98, 90, 88, 85, 82]'
          trend="negative"
          style="
            --noc-sparkline-width: 2;
            --noc-sparkline-radius: 2;
            --noc-sparkline-padding: 2;
            --noc-sparkline-margin: 2;
            --noc-sparkline-font-size: 12px;">
        </noc-sparkline> less framework bloat
      </p>
      </noc-card>
      <noc-card full-height size="100%">
        <span slot="header">patterns</span>
        <p>reusable layout snippets and components, drop-in nav and hero</p>
        <noc-code language="html">
          &lt;noc-reveal&gt;
            &lt;noc-pattern src="install-tree" /&gt;
          &lt;/noc-reveal&gt;   
        </noc-code>
      </noc-card>
    </div>
  </section>

  <section class="hydration-section" aria-labelledby="hydration-heading">
    <div class="hydration-bg" aria-hidden="true">
      <svg viewBox="0 0 400 200" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="hydration-dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="0.8" fill="currentColor" opacity="0.2">
              <animate attributeName="opacity" values="0.1;0.25;0.1" dur="3s" repeatCount="indefinite"/>
            </circle>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hydration-dots)" class="hydration-dots-rect"/>
      </svg>
    </div>
    <div class="hydration-content">
      <h2 id="hydration-heading">Nocturnal Status</h2>
      <p class="hydration-lead">The badge below reflects your current serve mode and whether JS is active.</p>
      <div class="hydration-demo">
        <div class="hydration-badge-wrap">
          <hydrated-badge>DSD Fallback</hydrated-badge>
        </div>
        <p class="hydration-caption"><strong>DSD Fallback</strong> — JS is off. Declarative Shadow DOM is rendering the component.<br><strong>SSG — Hydrated</strong> or <strong>SSR — Hydrated</strong> — JS is running and the component is hydrated.</p>
      </div>
    </div>
  </section>

  <noc-divider variant="gradient" style="--noc-divider-color: var(--border-subtle);"></noc-divider>

  <section aria-labelledby="form-heading">
    <h2 id="form-heading">Form Components</h2>
    <p>Interactive form example showcasing input, select, and button components with toast notifications.</p>
    <noc-pattern src="form-example" />
  </section>

  <noc-divider variant="gradient" style="--noc-divider-color: var(--border-subtle);"></noc-divider>

  <noc-reveal>
    <section aria-labelledby="patterns-heading">
      <h2 id="patterns-heading">Project Structure</h2>
      <p><code>install-tree.html</code> pattern uses <code>client:visible</code> hydration strategy with <code>lazy-html</code>.</p>
      <p>Open your network tab in the browser to see the lazy-html partials being loaded with immediate hydration from client:visible.</p>
      <noc-pattern src="install-tree" />
    </section>
  </noc-reveal>

  <noc-divider variant="gradient" style="--noc-divider-color: var(--border-subtle);"></noc-divider>

  <section aria-labelledby="installation-heading">
    <h2 id="installation-heading">Installation</h2>
    <p>Install the CLI and run commands from your project root.</p>
    <div class="panel">
      <ul class="command-list">
        <li><span class="command-label">install</span> <code>npm install github:dmac780/nocturnal</code> <noc-copy-button size="sm" value="npm install github:dmac780/nocturnal"></noc-copy-button></li>
        <li><span class="command-label">create project</span> <code>npm noc create</code> <noc-copy-button size="sm" value="npm noc create"></noc-copy-button></li>
        <li><span class="command-label">build</span> <code>npm noc build</code> <noc-copy-button size="sm" value="npm noc build"></noc-copy-button></li>
        <li><span class="command-label">serve</span> <code>npm noc serve</code> <noc-copy-button size="sm" value="npm noc serve"></noc-copy-button></li>
      </ul>
    </div>
  </section>

</main>
`,

  // About page
  'src/pages/about.html': `---
layout: default
title: About
description: Learn more about this site.
components: []
---

<main>
  <h1>About</h1>
  <p>This is the about page. Edit <code>src/pages/about.html</code> to customize it.</p>
  <p><a href="/">Back to home</a></p>
</main>
`,

  // 404 page
  'src/pages/404.html': `---
layout: default
title: 404 - Page Not Found
description: The page you're looking for doesn't exist.
components: []
---

<main>
  <section style="text-align: center; padding: 4rem 2rem;">
    <h1 style="font-size: 3rem; margin: 0 0 1rem;">404</h1>
    <p style="font-size: 1.125rem; margin-bottom: 2rem;">Page not found</p>
    <p><a href="/">← Back to home</a></p>
  </section>
</main>
`,

  // Blog index
  'src/pages/blog/index.html': `---
layout: default
title: Blog
description: Read the latest posts.
components: []
---

<main>
  <h1>Blog</h1>
  <p>Welcome to the blog!</p>
  
  <nav>
    <ul>
      <li><a href="/blog/hello-world">Hello World</a></li>
    </ul>
  </nav>
  
  <p><a href="/">Back to home</a></p>
</main>
`,

  // Blog post example
  'src/pages/blog/hello-world.html': `---
layout: default
title: Hello World - Blog
description: My first blog post using Nocturnal.
components: []
---

<main>
  <article>
    <h1>Hello World</h1>
    <p>This is my first blog post using Nocturnal!</p>
    <p>Nocturnal is a lightweight SSG framework for native Web Components.</p>
    <a href="/blog">Back to blog</a>
  </article>
</main>
`,

  // Navigation pattern (hamburger collapse on mobile, scoped CSS + JS)
  'src/patterns/nav.html': `---
components:
  - @user:theme-switcher
---
<style>
/* Nav pattern: scoped to .site-nav */
.site-nav {
  background: var(--bg-raised);
  border-bottom: 1px solid var(--border-subtle);
  padding: 1rem 0;
}
.site-nav .nav-inner {
  max-width: var(--content-max-width, 900px);
  min-width: 0;
  padding: 0 var(--content-padding, 2rem);
  margin: 0 auto;
  display: flex;
  flex-wrap: nowrap;
  gap: 2rem;
  align-items: center;
}
/* .site-nav .nav-inner strong { color: var(--accent); } */
.site-nav a { color: var(--text-secondary); text-decoration: none; }
.site-nav a:hover { color: var(--text-accent); }
.site-nav .nav-brand { flex-shrink: 0; }
.site-nav .nav-links {
  display: flex;
  gap: 2rem;
  align-items: center;
  list-style: none;
  margin: 0;
  padding: 0;
}
.site-nav .nav-links a { font-size: inherit; }
.site-nav .nav-spacer { flex: 1; }

/* Reserve space for theme-switcher before it hydrates 
(avoids nav jump in SSG if DSD not used) */
.site-nav theme-switcher:not(:defined) {
  display: inline-block;
  width: 2rem;
  height: 2rem;
  vertical-align: middle;
}

/* Hamburger: hidden on desktop */
.site-nav .nav-toggle {
  display: none;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 5px;
  width: 2.25rem;
  height: 2.25rem;
  padding: 0;
  background: none;
  border: 1px solid var(--border-subtle);
  color: var(--text-primary);
  cursor: pointer;
  border-radius: var(--radius-sm, 0.25rem);
  transition: border-color 0.2s;
}
.site-nav .nav-toggle:hover { border-color: var(--text-tertiary); }
.site-nav .nav-toggle span {
  display: block;
  width: 1rem;
  height: 1px;
  background: currentColor;
  transition: transform 0.2s, opacity 0.2s;
}
.site-nav.is-open .nav-toggle span:nth-child(1) {
  transform: translateY(6px) rotate(45deg);
}
.site-nav.is-open .nav-toggle span:nth-child(2) { opacity: 0; }
.site-nav.is-open .nav-toggle span:nth-child(3) {
  transform: translateY(-6px) rotate(-45deg);
}

.site-nav .nav-drawer {
  display: none;
  overflow: hidden;
  max-height: 0;
  transition: max-height 0.3s ease;
  background: var(--bg-raised);
}
.site-nav.is-open .nav-drawer {
  border-bottom: 1px solid var(--border-subtle);
}
.site-nav .nav-drawer-inner {
  padding: 0.5rem var(--content-padding, 2rem) 1rem;
}
.site-nav .nav-drawer a {
  display: block;
  padding: 0.6rem 0;
  font-size: 0.9375rem;
  border-bottom: 1px solid var(--border-subtle);
}
.site-nav .nav-drawer a:last-child { border-bottom: none; }
.site-nav.is-open .nav-drawer {
  max-height: 20rem;
}

@media (max-width: 48rem) {
  .site-nav .nav-links { display: none; }
  .site-nav .nav-toggle { display: flex; }
  .site-nav .nav-drawer { display: block; }
}
@media (min-width: 48.0625rem) {
  .site-nav .nav-drawer { display: none !important; }
}

/* Sticky + hide on scroll down, show on scroll up (add class .sticky-hide to nav) */
.site-nav.sticky-hide {
  position: sticky;
  top: 0;
  z-index: 200;
  transition: transform 0.25s ease-out;
}
.site-nav.sticky-hide.is-scrolled-down {
  transform: translateY(-100%);
}
</style>

<nav class="site-nav sticky-hide" id="site-nav" role="navigation">
  <div class="nav-inner">
    <a href="/" class="nav-brand" aria-label="Home"><strong>NOCTURNAL</strong></a>
    <span class="nav-spacer" aria-hidden="true"></span>
    <ul class="nav-links">
      <li><a href="/" aria-label="Home">home</a></li>
      <li><a href="/about" aria-label="About">about</a></li>
      <li><a href="/blog" aria-label="Blog">blog</a></li>
    </ul>
    <theme-switcher></theme-switcher>
    <button type="button" class="nav-toggle" id="nav-toggle" aria-label="Toggle menu" aria-expanded="false" aria-controls="nav-drawer">
      <span></span><span></span><span></span>
    </button>
  </div>
  <div class="nav-drawer" id="nav-drawer" role="region" aria-label="Mobile menu">
    <div class="nav-drawer-inner">
      <a href="/">home</a>
      <a href="/about">about</a>
      <a href="/blog">blog</a>
    </div>
  </div>
</nav>

<script>
(function () {
  var nav = document.getElementById('site-nav');
  var btn = document.getElementById('nav-toggle');
  var drawer = document.getElementById('nav-drawer');
  if (!nav || !btn || !drawer) return;
  function close() {
    nav.classList.remove('is-open');
    btn.setAttribute('aria-expanded', 'false');
  }
  function toggle() {
    nav.classList.toggle('is-open');
    btn.setAttribute('aria-expanded', nav.classList.contains('is-open'));
  }
  btn.addEventListener('click', toggle);
  drawer.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', close); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) close();
  });

  if (!nav.classList.contains('sticky-hide')) return;
  var lastScrollY = window.scrollY || 0;
  var threshold = 60;
  var ticking = false;
  function updateSticky() {
    var y = window.scrollY || 0;
    if (y <= 10) {
      nav.classList.remove('is-scrolled-down');
    } else if (y > lastScrollY && y > threshold) {
      nav.classList.add('is-scrolled-down');
    } else if (y < lastScrollY) {
      nav.classList.remove('is-scrolled-down');
    }
    lastScrollY = y;
    ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) {
      requestAnimationFrame(updateSticky);
      ticking = true;
    }
  }, { passive: true });
})();
</script>
`,

  // Hero pattern (dot grid + subtle lines, glitch title via clip-path + chromatic pseudo-elements)
  'src/patterns/hero.html': `<style>
.hero {
  position: relative;
  text-align: center;
  padding: 5rem 2rem;
  overflow: hidden;
}

/* Dot grid + subtle diagonal lines; radial mask so centered and symmetrical all sides */
.hero-pattern {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  -webkit-mask-image: radial-gradient(ellipse 80% 70% at 50% 50%, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.15) 50%, transparent 100%);
  mask-image: radial-gradient(ellipse 80% 70% at 50% 50%, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.15) 50%, transparent 100%);
  animation: hero-pattern-animation 10s infinite alternate;
  animation-timing-function: cubic-bezier(0.4, 0, 0.4, 1);
}
.hero-pattern svg {
  width: 100%;
  height: 100%;
}

@keyframes hero-pattern-animation {
  0% { transform: scale(1); }
  100% { transform: scale(1.2); }
}

.hero-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: min(80vw, 12rem);
  height: min(80vw, 12rem);
  background: radial-gradient(
    ellipse at center,
    color-mix(in srgb, var(--accent) 35%, transparent) 0%,
    color-mix(in srgb, var(--accent) 12%, transparent) 45%,
    transparent 70%
  );
  filter: blur(60px);
  pointer-events: none;
  z-index: 0;
}

@keyframes hero-glitch-slice {
  0% { clip-path: inset(100% 0 0 0); }
  5% { clip-path: inset(12% 0 75% 0); }
  10% { clip-path: inset(88% 0 2% 0); }
  15% { clip-path: inset(45% 0 40% 0); }
  20% { clip-path: inset(3% 0 90% 0); }
  25% { clip-path: inset(60% 0 25% 0); }
  30% { clip-path: inset(100% 0 0 0); }
  35% { clip-path: inset(22% 0 68% 0); }
  40% { clip-path: inset(70% 0 18% 0); }
  45% { clip-path: inset(8% 0 85% 0); }
  50% { clip-path: inset(55% 0 30% 0); }
  55% { clip-path: inset(100% 0 0 0); }
  60% { clip-path: inset(35% 0 55% 0); }
  65% { clip-path: inset(78% 0 5% 0); }
  70% { clip-path: inset(15% 0 80% 0); }
  75% { clip-path: inset(50% 0 42% 0); }
  80% { clip-path: inset(92% 0 3% 0); }
  85% { clip-path: inset(28% 0 65% 0); }
  90% { clip-path: inset(65% 0 22% 0); }
  95% { clip-path: inset(5% 0 92% 0); }
  100% { clip-path: inset(100% 0 0 0); }
}

.hero-title {
  position: relative;
  z-index: 1;
  font-size: clamp(2.5rem, 8vw, 4rem);
  font-weight: 700;
  margin: 0 0 0.5rem;
  color: var(--text-primary);
  text-shadow: 0 0 40px color-mix(in srgb, var(--accent) 40%, transparent);
  transform: scale3d(1, 1, 1);
}

.hero-title::before,
.hero-title::after {
  content: attr(data-text);
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  overflow: hidden;
  background: color-mix(in srgb, var(--bg-base) 45%, transparent);
  color: var(--text-primary);
  clip-path: inset(100% 0 0 0);
  pointer-events: none;
}

.hero-title::before {
  left: 2px;
  text-shadow: 1px 0 var(--accent);
  animation: hero-glitch-slice 12s infinite linear alternate-reverse;
}

.hero-title::after {
  left: -2px;
  text-shadow: -1px 0 var(--text-accent);
  animation: hero-glitch-slice 12s infinite linear alternate-reverse;
}

.hero-tagline {
  position: relative;
  z-index: 1;
  font-size: 1.25rem;
  color: var(--text-secondary);
  margin: 0;
  max-width: 36rem;
  margin-left: auto;
  margin-right: auto;
}
</style>

<section class="hero">
  <div class="hero-pattern" aria-hidden="true">
    <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      <defs>
        <pattern id="hero-dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" fill="currentColor"/>
        </pattern>
        <pattern id="hero-diag" x="0" y="0" width="12" height="12" patternUnits="userSpaceOnUse">
          <line x1="0" y1="12" x2="12" y2="0" stroke="currentColor" stroke-width="0.4" opacity="0.5"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#hero-dots)" style="color: var(--text-accent); opacity: 0.85"/>
      <rect width="100%" height="100%" fill="url(#hero-diag)" style="color: var(--text-accent)" opacity="0.25"/>
    </svg>
  </div>
  <div class="hero-glow" aria-hidden="true"></div>
  <h1 class="hero-title" data-text="NOCTURNAL.js">NOCTURNAL.js</h1>
  <p class="hero-tagline">Static-First Shadow DOM Web Component Framework with SSR & Native Hydration.</p>
</section>
`,

  // Footer pattern
  'src/patterns/footer.html': `<footer class="site-footer">
  <p>nocturnal.js <script>document.write(new Date().getFullYear());</script> <a href="https://imaginationdriver.com" target="_blank" rel="noopener noreferrer">imaginationdriver.com</a> - <a href="https://github.com/dmac780/nocturnal" target="_blank" rel="noopener noreferrer">GitHub</a></p>
</footer>
`,

  // Install-tree pattern (hydrated island, lazy-html = partials auto-generated from this)
  'src/patterns/install-tree.html': `---
components:
  - @core:tree
  - @core:tree-item
hydrate: true
island: install-tree
strategy: client:visible
lazy-html: true
---
<style>
  .split-view {
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-template-areas: "tree content";
    gap: 0;
    min-height: 420px;
    min-width: 0;
    max-width: 100%;
    margin: 0 auto;
    padding: 2rem;
    border: 1px solid var(--border-default);
    border-radius: 8px;
    overflow: hidden;
    background: var(--bg-raised);
  }

  .split-view-left {
    grid-area: tree;
    min-width: 0;
    padding: 1rem;
    border-right: 1px solid var(--border-subtle);
    overflow: auto;
    min-height: 450px;
  }

  .split-view-right {
    grid-area: content;
    min-width: 0;
    overflow: auto;
    min-height: 200px;
  }

  .split-view-right .content {
    padding: 1rem;
    color: var(--text-primary);
  }

  .split-title {
    font-size: 1.2rem;
    font-weight: 600;
    margin-bottom: 0.5rem;
  }
  
  noc-tree:not(:defined) {
    opacity: 0;
    min-height: 420px;
    max-width: 100%;
  }

  noc-tree-item {
    --noc-color: var(--text-primary);
    --noc-accent: var(--accent);
    --noc-accent-alpha: color-mix(in srgb, var(--accent) 20%, transparent);
  }

  .folder-icon.open { display: none; }
  noc-tree-item[expanded] > .folder-icon.closed { display: none; }
  noc-tree-item[expanded] > .folder-icon.open { display: inline; }

  @media (max-width: 30rem) {
    .split-view {
      grid-template-columns: 1fr;
      grid-template-areas: "content" "tree";
      padding: 1rem;
    }

    .split-view-left {
      border-right: none;
      border-top: 1px solid var(--border-subtle);
    }
  }

  @media (min-width: 30.0625rem) and (max-width: 640px) {
    .split-view {
      grid-template-columns: 1fr;
      grid-template-areas: "content" "tree";
    }

    .split-view-left {
      border-right: none;
      border-top: 1px solid var(--border-subtle);
    }
  }
</style>

<div class="split-view">
  <div class="split-view-left">

    <noc-tree selection="leaf">
      <noc-tree-item data-index="0" class="tree-item">
        <span class="folder-icon closed" aria-hidden="true">📁</span><span class="folder-icon open" aria-hidden="true">📂</span> dist
        <div slot="children">
          <noc-tree-item data-index="0" class="tree-item">compiled output</noc-tree-item>
        </div>
      </noc-tree-item>
      <noc-tree-item data-index="1" class="tree-item">
        <span class="folder-icon closed" aria-hidden="true">📁</span><span class="folder-icon open" aria-hidden="true">📂</span> node_modules
        <div slot="children">
          <noc-tree-item data-index="2" class="tree-item"><span class="folder-icon closed" aria-hidden="true">📁</span><span class="folder-icon open" aria-hidden="true">📂</span> nocturnal-components
          <div slot="children">
            <noc-tree-item data-index="3" class="tree-item">📄 component.js</noc-tree-item>
          </div>
          </noc-tree-item>
          <noc-tree-item data-index="4" class="tree-item"><span class="folder-icon closed" aria-hidden="true">📁</span><span class="folder-icon open" aria-hidden="true">📂</span> nocturnal
          </noc-tree-item>
        </div>
      </noc-tree-item>
      <noc-tree-item expanded data-index="5" class="tree-item"><span class="folder-icon closed" aria-hidden="true">📁</span><span class="folder-icon open" aria-hidden="true">📂</span> src
        <div slot="children">
          <noc-tree-item data-index="6" class="tree-item">📄 config.js</noc-tree-item>
          <noc-tree-item data-index="7" class="tree-item">📄 .env.example</noc-tree-item>
          <noc-tree-item data-index="8" class="tree-item"><span class="folder-icon closed" aria-hidden="true">📁</span><span class="folder-icon open" aria-hidden="true">📂</span> api</noc-tree-item>
          <noc-tree-item data-index="9" class="tree-item"><span class="folder-icon closed" aria-hidden="true">📁</span><span class="folder-icon open" aria-hidden="true">📂</span> partials</noc-tree-item>
          <noc-tree-item data-index="10" class="tree-item"><span class="folder-icon closed" aria-hidden="true">📁</span><span class="folder-icon open" aria-hidden="true">📂</span> components</noc-tree-item>
          <noc-tree-item data-index="11" class="tree-item"><span class="folder-icon closed" aria-hidden="true">📁</span><span class="folder-icon open" aria-hidden="true">📂</span> layouts</noc-tree-item>
          <noc-tree-item data-index="12" class="tree-item"><span class="folder-icon closed" aria-hidden="true">📁</span><span class="folder-icon open" aria-hidden="true">📂</span> pages</noc-tree-item>
          <noc-tree-item data-index="13" class="tree-item"><span class="folder-icon closed" aria-hidden="true">📁</span><span class="folder-icon open" aria-hidden="true">📂</span> patterns</noc-tree-item>
          <noc-tree-item data-index="14" class="tree-item"><span class="folder-icon closed" aria-hidden="true">📁</span><span class="folder-icon open" aria-hidden="true">📂</span> public</noc-tree-item>
        </div>
      </noc-tree-item>
    </noc-tree>

  </div>
  <div class="split-view-right">
    <div id="content" class="content">
      <span class="split-title">Content</span>
      <p>Browse the file structure to see what is available.</p>
    </div>
  </div>
</div>

<script type="text/javascript" data-island-extract>
const content = [
  { title: 'dist', content: '<span class="split-title">dist/</span><p>Your static website files will be here when you build your site.<br><br><code>noc build</code> or <code>noc serve</code></p>' },
  { title: 'node_modules', content: '<span class="split-title">node_modules/</span><p>nocturnal-components will be here when you install nocturnal.<br><br><code>npm install github:dmac780/nocturnal</code></p>' },
  { title: 'nocturnal-components', content: '<span class="split-title">nocturnal-components/</span><p>A collection of 50+ curated web components that you can use to build your site.</p>' },
  { title: 'component.js', content: '<span class="split-title">component.js</span><p>Native shadowDOM web components with SSR fallback and automatic hydration.</p>' },
  { title: 'nocturnal', content: '<span class="split-title">nocturnal</span><p>Nocturnal core. SSG, SSR, and proper hydration.</p>' },
  { title: 'src', content: '<span class="split-title">src/</span><p>Your source files and assets are managed here.</p>' },
  { title: 'config.js', content: '<span class="split-title">config.js</span><p>Site configuration. Turn SSG into SSR and control hydration with a single setting.</p>' },
  { title: '.env.example', content: '<span class="split-title">.env.example</span><p>Template for env vars. Copy to <code>.env</code> and set values. In prod, set vars on your host.</p>' },
  { title: 'api', content: '<span class="split-title">api/</span><p>API route handlers. <code>src/api/foo.js</code> → <code>GET/POST /api/foo</code>. SSR only.</p>' },
  { title: 'partials', content: '<span class="split-title">partials/</span><p>Auto-generated from lazy-html patterns. Do not edit by hand.</p>' },
  { title: 'components', content: '<span class="split-title">components/</span><p>Custom web components live here.</p>' },
  { title: 'layouts', content: '<span class="split-title">layouts/</span><p>HTML layouts (e.g. default.html) wrap page content.</p>' },
  { title: 'pages', content: '<span class="split-title">pages/</span><p>Markdown and HTML pages. Optional <code>*.server.js</code> for load() data.</p>' },
  { title: 'patterns', content: '<span class="split-title">patterns/</span><p>Reusable fragments (nav, hero) included via <code>noc-pattern</code>. Can hydrate as islands.</p>' },
  { title: 'public', content: '<span class="split-title">public/</span><p>Static assets: CSS, JS, fonts, images. Served from the root.</p>' },
];
const tree = document.querySelector('noc-tree');
if (tree) {
  tree.addEventListener('click', (event) => {
    const path = event.composedPath();
    const treeItem = path.find(el => el.tagName === 'NOC-TREE-ITEM');
    if (!treeItem) return;
    const index = parseInt(treeItem.getAttribute('data-index'), 10);
    if (Number.isNaN(index) || index < 0 || index >= content.length) return;
    const contentEl = document.getElementById('content');
    if (contentEl) contentEl.innerHTML = content[index].content;
  });
}
</script>
`,

  // API: form-example POST (SSR only) — used by form-example pattern when ssr: true
  'src/api/form-example.js': `/**
 * POST /api/form-example — Accept form payload (JSON). Returns ok + server time.
 * Used by form-example pattern when SSR is enabled.
 */
export function POST({ body, json, error }) {
  if (!body?.name || !body?.topic || !body?.message) {
    return error('Missing name, topic, or message', 400);
  }
  return json({
    ok: true,
    serverTime: new Date().toISOString(),
  }, 201);
}
`,

  // Form example pattern (hydrated island)
  'src/patterns/form-example.html': `---
components:
  - @core:input
  - @core:textarea
  - @core:button
  - @core:select
  - @core:option
  - @core:toast
  - @core:toast-stack
hydrate: true
strategy: client:visible
---
<style>
.form-demo {
  max-width: 480px;
  margin: 2.5rem auto 0;
  padding: 2rem;
  background: var(--bg-raised);
  border: 1px solid var(--border-subtle);
  border-radius: 12px;
}

.form-demo h3 {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 1.5rem;
}

.form-demo form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.form-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  margin-top: 0.5rem;
}
</style>

<div class="form-demo">
  <h3>Contact Form</h3>
  <form id="contact-form">
    <noc-input
      id="name"
      label="Full Name"
      placeholder="Enter your name"
      required
    ></noc-input>

    <noc-select
      id="topic"
      label="Topic"
      placeholder="Select a topic"
      required
    >
      <noc-option value="general">General Inquiry</noc-option>
      <noc-option value="support">Technical Support</noc-option>
      <noc-option value="feedback">Feedback</noc-option>
      <noc-option value="other">Other</noc-option>
    </noc-select>

    <noc-textarea
      id="message"
      label="Message"
      placeholder="Your message..."
      rows="4"
      variant="ghost"
      required
    ></noc-textarea>

    <div class="form-actions">
      <noc-button type="button" id="reset-btn">Reset</noc-button>
      <noc-button type="submit" variant="primary">Submit</noc-button>
    </div>
  </form>
</div>

<noc-toast-stack id="toast-stack" placement="top-right"></noc-toast-stack>

<script data-island-extract>
const island = document.querySelector('[data-island="form-example"]');
const container = island || document;

const form = container.querySelector('#contact-form');
const resetBtn = container.querySelector('#reset-btn');
const toastStack = container.querySelector('#toast-stack');

if (!form || !resetBtn || !toastStack) {
  console.error('[form-example] Elements not found:', { form: !!form, resetBtn: !!resetBtn, toastStack: !!toastStack });
}

function getFormData() {
  const name = container.querySelector('#name');
  const topic = container.querySelector('#topic');
  const message = container.querySelector('#message');
  return { 
    name: name?.value || '', 
    topic: topic?.value || '', 
    message: message?.value || '' 
  };
}

function showToast(message, variant = 'success') {
  if (!toastStack) return;
  const toast = document.createElement('noc-toast');
  toast.setAttribute('variant', variant);
  toast.setAttribute('duration', '4000');
  toast.textContent = message;
  toastStack.appendChild(toast);
}

function isSSR() {
  const meta = document.querySelector('meta[name="nocturnal-render"]');
  return meta && meta.getAttribute('content') === 'ssr';
}

function handleSubmit() {
  const data = getFormData();
  if (!data.name || !data.topic || !data.message) {
    showToast('Please fill out required fields', 'warning');
    return;
  }

  if (isSSR()) {
    fetch('/api/form-example', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
      .then((res) => res.json())
      .then((result) => {
        const time = result.serverTime ? new Date(result.serverTime).toLocaleString() : 'server';
        showToast(\`Thank you for your message. Processed on server at \${time}.\`, 'success');
        resetForm();
      })
      .catch((err) => {
        showToast(\`Could not send: \${err.message}\`, 'error');
      });
    return;
  }
  showToast('Message sent!', 'success');
  console.log('Form data:', data);
  resetForm();
}

if (form) {
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    handleSubmit();
  });
}

function resetForm() {
  if (!form) return;
  form.reset();
  const name = container.querySelector('#name');
  const topic = container.querySelector('#topic');
  const message = container.querySelector('#message');
  if (name) name.value = '';
  if (topic) topic.value = '';
  if (message) message.value = '';
}

if (resetBtn) {
  resetBtn.addEventListener('click', () => {
    resetForm();
    showToast('Form reset', 'info');
  });
}
</script>
`,

  // User CSS
  'src/public/css/style.css': `:root,
[data-theme="dark"] {
  --content-max-width: 900px;
  --content-padding: 2rem;

  --bg-base: #000000;
  --bg-raised: #080808;
  --bg-sunken: #000000;
  --bg-hover: #141414;
  --bg-active: #1a1a1a;
  --border-subtle: #1a1a1a;
  --border-default: #262626;
  --text-primary: #ededed;
  --text-secondary: #a3a3a3;
  --text-tertiary: #737373;
  --text-accent: #f9a8d4;
  --accent: #e555a5;
  --radius-sm: 0.25rem;
}

[data-theme="light"] {
  --bg-base: #fafafa;
  --bg-raised: #ffffff;
  --bg-sunken: #f0f0f0;
  --bg-hover: #f0f0f0;
  --bg-active: #e5e5e5;
  --border-subtle: #e5e5e5;
  --border-default: #d4d4d4;
  --text-primary: #171717;
  --text-secondary: #525252;
  --text-tertiary: #737373;
  --text-accent: #c73d8a;
  --accent: #e555a5;
}

html {
  font-size: 100%;
  line-height: 1.5;
  scrollbar-gutter: stable;
  overflow-x: clip;
}

body {
  margin: 0;
  font-family: ui-monospace, "Cascadia Code", "Source Code Pro", Menlo, monospace;
  font-size: 0.875rem;
  line-height: 1.6;
  background: var(--bg-base);
  color: var(--text-primary);
  -webkit-font-smoothing: antialiased;
  overflow-x: clip;
  width: 100%;
}

nav {
  background: var(--bg-raised);
  border-bottom: 1px solid var(--border-subtle);
  padding: 1rem 0;
}

nav .nav-inner {
  max-width: var(--content-max-width);
  min-width: 0;
  padding: 0 var(--content-padding);
  margin: 0 auto;
  display: flex;
  gap: 2rem;
  align-items: center;
}

nav a,
.site-footer a {
  color: var(--text-secondary);
  text-decoration: none;
}

nav a:hover,
.site-footer a:hover {
  color: var(--text-accent);
}

code {
  background: color-mix(in srgb, var(--accent) 16%, transparent);
  color: var(--text-accent);
  padding: 0.15rem 0.6rem;
  border-radius: var(--radius-sm, 0.25rem);
  font-family: inherit;
  font-size: 0.875em;
}

*, *::before, *::after {
  box-sizing: border-box;
}

main {
  width: 100%;
  max-width: var(--content-max-width);
  margin: 0 auto;
  padding: var(--content-padding);
  min-width: 0;
}

main section {
  padding: 2.5rem 0;
}

main h2 {
  font-size: 1.125rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: var(--text-primary);
  margin: 0 0 1rem;
}

main p {
  color: var(--text-secondary);
  margin: 0 0 0.75rem;
}
main p:last-child {
  margin-bottom: 0;
}

main ul {
  color: var(--text-secondary);
  margin: 0 0 1rem;
  padding-left: 1.5rem;
}
main li {
  margin-bottom: 0.35rem;
}

.panel {
  background: var(--bg-raised);
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
  padding: 1.5rem 2rem;
}

.command-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.command-list li {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-bottom: 0;
}

.command-label {
  color: var(--text-secondary);
  font-size: 0.875rem;
  min-width: 6rem;
}

footer.site-footer {
  color: var(--text-secondary);
  padding: 2rem 0;
  text-align: center;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.5rem;
  margin-top: 1rem;
  align-items: stretch;
  min-width: 0;
}

main section noc-card {
  --noc-card-bg: var(--bg-raised);
  --noc-card-color: var(--text-secondary);
  --noc-card-header-color: var(--text-primary);
  --noc-card-border: var(--border-subtle);
  --noc-card-padding: 2rem;
  --noc-card-radius: 0.5rem;
  --noc-accent: var(--accent);
}

.features-grid noc-card {
  height: 100%;
  min-height: 12rem;
  min-width: 0;
}
@media (max-width: 48rem) {
  .features-grid {
    grid-template-columns: 1fr;
  }
}

.hydration-section {
  position: relative;
  padding: 4rem 0;
  overflow: hidden;
}

.hydration-bg {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  opacity: 0.7;
  -webkit-mask-image: radial-gradient(ellipse 90% 80% at 50% 50%, black 0%, transparent 70%);
  mask-image: radial-gradient(ellipse 90% 80% at 50% 50%, black 0%, transparent 70%);
}

.hydration-bg svg {
  width: 100%;
  height: 100%;
  object-fit: cover;
  color: var(--accent);
}

.hydration-content {
  position: relative;
  z-index: 1;
  padding: 2rem 0;
  margin: 0;
}

.hydration-section h2 {
  margin: 0 0 0.75rem;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary);
}

.hydration-lead {
  color: var(--text-secondary);
  margin: 0 0 2rem;
  font-size: 0.9375rem;
  max-width: 42em;
}

.hydration-demo {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1rem;
  padding: 2rem;
  background: transparent;
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
  margin-bottom: 2rem;
}

.hydration-badge-wrap {
  display: flex;
  align-items: center;
}

.hydration-caption {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--text-secondary);
}

.hydration-notes {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.hydration-note {
  font-size: 0.875rem;
  color: var(--text-secondary);
  padding: 1rem 1.25rem;
  background: var(--bg-sunken);
  border-radius: 6px;
  border-left: 3px solid var(--accent);
}

.hydration-note strong {
  color: var(--text-primary);
  font-weight: 600;
}

.hydration-note code {
  font-size: 0.85em;
}

main > section{
  opacity: 0;
}
main > section,
main > noc-reveal {
  animation: fadeInUp 1.0s ease forwards;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(1rem);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

main > section:nth-child(2),
main > noc-reveal:nth-child(2) { animation-delay: 0.1s; }
main > section:nth-child(3),
main > noc-reveal:nth-child(3) { animation-delay: 0.2s; }
main > section:nth-child(4),
main > noc-reveal:nth-child(4) { animation-delay: 0.3s; }
main > section:nth-child(5),
main > noc-reveal:nth-child(5) { animation-delay: 0.4s; }
main > section:nth-child(6),
main > noc-reveal:nth-child(6) { animation-delay: 0.5s; }
`,

  // Theme init (runs in head before paint to avoid flash)
  'src/public/js/theme-init.js': `(function(){
  var t = localStorage.getItem('noc-theme');
  if (t === 'dark' || t === 'light') document.documentElement.setAttribute('data-theme', t);
})();
`,

  // User JS
  'src/public/js/main.js': `// Any custom JavaScript outside of components or patterns should be placed here:
`,
};

/**
 * Directory structure to create
 */
export const directories = [
  'src/pages/blog',
  'src/layouts',
  'src/patterns',
  'src/api',
  'src/components',
  'src/public/css',
  'src/public/js',
  'src/public/assets',
  'src/partials',  // auto-generated from lazy-html patterns; do not edit by hand
];

# Nocturnal

SSG-first meta-framework for native Web Components. Build static sites with **nocturnal-components** (50+ Shadow DOM components), file-based routing, pattern includes, and optional island hydration.

**⚠️ Experimental.** This project is in active development. APIs and behavior may change as edge cases and standardization are worked through.

## Philosophy

- **Web component first** — UI is native custom elements and Shadow DOM. No virtual DOM, no framework runtime.
- **Lightweight** — Node.js build; dependency on **nocturnal-components** for the component set. No bundler.
- **SSG default** — Pages pre-render to static HTML. JS only for islands and components you use.
- **File-based routing** — Pages map 1:1 to files in `src/pages/`. Clean URLs (e.g. `about.html` → `/about/`).
- **Asset delivery** — Strong focus on *where* and *how* scripts and styles load per page: route-based config, critical/head/body placement, inline vs preload, and minimal duplicate work.

## Development status

This is a **development project**. Current focus:

- **Edge cases** — Declarative Shadow DOM (DSD) inside DSD, template rendering, and proper fallbacks (e.g. no-JS, SSG vs SSR) are being tightened up.
- **Components** — The component set is not standardized yet. There are minor visual and responsive issues that are being cleared as the system reaches stable, standardized behavior.
- **Phase 2 (planned)** — Reactive state with WebSockets; server components, database abstraction layer ect. likely migration from Node/npm to Bun.js.
- **Coming** — Cache layer for SSR (faster responses, preloading).

The system is built around **asset delivery optimization** and **fidelity in how and where your scripts render per page** (routes, position, inline, preload, islands).

## Requirements

- Node.js >= 18

## Install

```bash
npm install github:dmac780/nocturnal
```

The CLI is **`noc`** (from the package `bin`).

## Quick start

```bash
# 1. Scaffold a new project (creates src/ from bootstrap; safe, won't overwrite)
noc create

# 2. Build
noc build

# 3. Preview
noc serve
```

Other commands: **`noc watch`** (dev mode: build and rebuild on file changes).

## Project structure (after `noc create`)

```
my-site/
├── src/
│   ├── config.js           # Site and asset config (styles, scripts, ssr, hydrateIslands, etc.)
│   ├── pages/              # File-based routes
│   │   ├── index.html
│   │   ├── about.html
│   │   └── blog/
│   │       ├── index.html
│   │       └── hello-world.html
│   ├── layouts/            # Layouts: {{title}}, {{content}}, {{headExtras}}, {{bodyExtras}}, {{islandScript}}
│   │   └── default.html
│   ├── patterns/           # Reusable fragments included via <noc-pattern src="name" />
│   │   ├── nav.html
│   │   ├── hero.html
│   │   ├── footer.html
│   │   ├── install-tree.html
│   │   └── form-example.html
│   ├── components/        # Your custom components (@user: alias)
│   │   ├── hydrated-badge.js
│   │   └── theme-switcher.js
│   └── public/
│       ├── css/
│       │   └── style.css
│       └── js/
│           ├── main.js
│           └── theme-init.js
├── dist/                  # Build output (noc build)
├── node_modules/
│   └── nocturnal-components/   # Core component set (card, button, input, select, etc.)
└── (framework files: cli.js, builder.js, renderer.js, islands.js, bootstrap.js, ...)
```

**Note:** In the Nocturnal core repo, `src/` is not tracked; it is created by **`noc create`** from the bootstrap. When you install Nocturnal as a dependency and run `noc create` in your project, you get the structure above.

## CLI

| Command | Description |
|--------|-------------|
| `noc create` | Scaffold project (directories + files from bootstrap). Skips existing files. |
| `noc build` | Pre-render all pages → `dist/`. Copies components, public assets, and nocturnal-components. |
| `noc watch` | Build once, then rebuild on file changes. |
| `noc serve` | Serve `dist/` (SSG) or run SSR server if `config.ssr` is true. |

**Options:** `--root <path>`, `--env <dev|prod|stage>`, `--port <number>`, `--help`

## Config (`src/config.js`)

All site and build configuration lives in **`src/config.js`** (no root `nocturnal.config.js`).

| Key | Description |
|-----|-------------|
| `outputDir` | Build output directory (default `'dist'`). |
| `baseURL` | Base URL for asset paths (default `'/'`). |
| `environments` | Per-env overrides (e.g. `dev` / `prod` / `stage`) for `baseURL`. Used with `noc build --env prod`. |
| `ssr` | Enable SSR; `noc serve` then uses the SSR server. |
| `hydrateIslands` | Enable island hydration (default `true`). Patterns with `hydrate: true` get inlined island code. |
| `minify` | `{ css: true, js: true }` to minify CSS/JS at build time. |
| `compress` | Gzip/Brotli for SSR; no effect for SSG. |
| `styles` | Array of style entries: `href`, `routes`, `position` (optional), `rel`, `inline`, etc. |
| `scripts` | Array of script entries: `src`, `routes`, `position` (`'head'` \| `'body'` \| `'critical'`), `type`, `inline`, etc. |

See **[README_ASSETS.md](./README_ASSETS.md)** for full asset options (routes, position, preload, inline, defer, async, critical path).

## Pages and frontmatter

Pages are HTML files with optional YAML frontmatter:

```yaml
---
layout: default
title: Home
description: Home page.
components:
  - @core:card
  - @core:button
  - @user:theme-switcher
---
```

- **`layout`** — Layout from `src/layouts/<layout>.html`.
- **`title`**, **`description`** — Available as `{{title}}`, `{{description}}` in the layout.
- **`components`** — List of components to load on this page. Each gets a single import (deduped across page + patterns).

### Component aliases

| Prefix | Resolves to |
|--------|-------------|
| `@core:name` | `/nocturnal-components/components/<name>/<name>.js` (from node_modules) |
| `@user:path` | `/components/<path>.js` (from `src/components/`) |

The build injects `<link rel="modulepreload">` and one `<script type="module">` that imports each unique component so `customElements.define()` runs.

## Patterns

Reusable HTML fragments in `src/patterns/`. Include in pages or layouts with:

```html
<noc-pattern src="hero" />
<noc-pattern src="nav" />
<noc-pattern src="footer" />
```

Patterns can have frontmatter:

```yaml
---
components:
  - @core:tree
hydrate: true
strategy: client:visible
lazy-html: true
---
```

- **`components`** — Same as page; merged into the page’s component set.
- **`hydrate: true`** — Wrap content in a `[data-island]` and extract `<script data-island-extract>` into the island map. Island code is inlined in the page (runtime + map).
- **`strategy`** — `client:load` \| `client:visible` \| `client:idle` (when to run the island JS).
- **`lazy-html: true`** — Emit a placeholder; full HTML is fetched from `/partials/<name>.html` when the island hydrates (reduces initial page size).

Pattern `<style>` blocks are extracted, deduped by pattern name, and combined into one `<style>` in the head (minified when `config.minify.css` is true).

## Layouts

Layouts live in `src/layouts/`. Tokens:

| Token | Content |
|-------|--------|
| `{{title}}` | Page title |
| `{{description}}` | Page description |
| `{{criticalPath}}` | Styles/scripts with `position: 'critical'` |
| `{{headExtras}}` | Component preloads + import script, pattern CSS, config styles/scripts (head) |
| `{{content}}` | Rendered page body (patterns inlined) |
| `{{bodyExtras}}` | Config scripts with `position: 'body'` |
| `{{islandScript}}` | Inlined island hydration (runtime + map) when the page has hydrate patterns |

Example:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <title>{{title}}</title>
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
```

## Island hydration

- **Runtime** — `islands.js` in the project root (from the framework) defines `hydrateIslands()` and strategies (`client:load`, `client:visible`, `client:idle`).
- **Build** — The builder reads `islands.js`, extracts island scripts from patterns with `hydrate: true`, builds an island map, and **inlines** the merged code (runtime + map) into each page’s `{{islandScript}}`. No separate `island-build.js` in normal use.
- **Strategies** — `client:load` (immediate), `client:visible` (IntersectionObserver), `client:idle` (requestIdleCallback).

## Build output (`dist/`)

- **HTML** — One file per page (e.g. `index.html`, `about/index.html`, `blog/hello-world/index.html`).
- **dist/public/** — Copied from `src/public/` (CSS, JS, fonts, images).
- **dist/components/** — Copied from `src/components/`.
- **dist/nocturnal-components/** — Copied from `node_modules/nocturnal-components/`.
- **dist/partials/** — Generated from patterns with `lazy-html: true`; island HTML is fetched on demand.

## Asset and script configuration

For full control over CSS and JS (routes, position, inline, preload, defer, async, critical), see **[README_ASSETS.md](./README_ASSETS.md)**.

## SSR

Set `ssr: true` in `src/config.js`. After rebuilding, **`noc serve`** runs the SSR server: pages are rendered on request, with the same layout and island inlining. Compression (gzip/brotli) can be enabled via `compress: true`.

## Summary

- **Scaffold:** `noc create` → bootstrap writes `src/` (pages, layouts, patterns, config, public, components).
- **Config:** `src/config.js` only (outputDir, baseURL, ssr, hydrateIslands, minify, compress, styles, scripts).
- **Pages:** HTML + frontmatter; `components` and `<noc-pattern>`; layouts via `layout:`.
- **Patterns:** `<noc-pattern src="name" />`; optional `hydrate`, `strategy`, `lazy-html`.
- **Islands:** Inlined per page when `hydrateIslands` is on and the page uses hydrate patterns.
- **Build:** `noc build` → `dist/` with HTML, public, components, and nocturnal-components.

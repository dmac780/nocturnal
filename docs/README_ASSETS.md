# Asset Management: JS & CSS in Nocturnal

Nocturnal gives you fine-grained control over how JavaScript and CSS are loaded so you can hit maximum web page performance. The engine is built for **component-first, no-waste loading**: no duplicate component imports, one bundled pattern CSS block per page (inlined and minified), and config-driven scripts/styles with full control over routes, position, defer, async, and preload.

---

## Overview

| Concern | How Nocturnal handles it |
|--------|---------------------------|
| **Web component scripts** | Declared in page/pattern frontmatter; collected in a **Set** so the same component is never imported twice on a page, even if used in multiple patterns. |
| **Pattern CSS** | All `<style>` blocks from patterns are **extracted**, **deduped by pattern name**, combined into **one inline `<style>` in the head**, and **minified** when `config.minify.css` is on. No duplicate CSS, no extra network requests. |
| **Global / per-route assets** | `config.styles` and `config.scripts` support **routes** (`'*'` for global, `'/blog/*'`, or exact paths) so you load only what each page needs. |
| **Load order & placement** | Scripts can go in **head** or **body**; you can use **defer**, **async**, **preload** (modulepreload), or **inline** for critical path. Same for CSS: **preload** + **stylesheet**, **async**, or **inline**. |

---

## JavaScript

### 1. Web component imports (no duplicates)

Components are declared in **frontmatter** on pages and patterns:

```yaml
---
components:
  - @user:theme-switcher
  - @core:tree
---
```

The renderer **collects every component** from the page body and from every inlined pattern (including the layout). It uses a **Set**, so each component is only ever included **once per page**, no matter how many patterns use it (e.g. nav and hero both using `theme-switcher` still yields one import).

For that unique list the engine outputs:

- **`<link rel="modulepreload" href="...">`** for each component script (so the browser can fetch early).
- **One `<script type="module">`** in the head that **imports** each component so `customElements.define()` runs.

Result: minimal JS, no duplicate network requests, no duplicate registration.

---

### 2. Config scripts (`config.scripts`)

Use `config.scripts` for your own scripts (main app, theme init, analytics, etc.) with full control over where and when they load.

| Option | Type | Default | Description |
|--------|------|--------|-------------|
| `src` | string | **required** | Path to the JS file (e.g. `'/public/js/main.js'`). |
| `routes` | `string` or `string[]` | **required** | Where the script loads: `'*'` (all pages), `'/about'`, or `'/blog/*'` (blog and children). |
| `position` | `'head'` \| `'body'` \| `'critical'` | `'head'` | Injected into `{{criticalPath}}` (critical), `{{headExtras}}` (head), or `{{bodyExtras}}` (body). |
| `type` | string | — | e.g. `'module'` for ES modules. |
| `defer` | boolean | false | Add `defer` (classic scripts). Ignored if `async` is true. |
| `async` | boolean | false | Add `async`. |
| `preload` | boolean | false | In head: also emit `<link rel="modulepreload" href="...">` so the module is fetched early. |
| `inline` | boolean | false | Read the file and inject its contents into a `<script>` (no network request). |
| `attrs` | object | {} | Extra HTML attributes (e.g. `crossorigin`, `integrity`). |

**Examples**

```js
scripts: [
  // Main app: body, module, defer
  {
    src: '/public/js/main.js',
    routes: '*',
    position: 'body',
    type: 'module',
    defer: true,
  },
  // Critical path: inline in head (e.g. theme flash prevention)
  {
    src: '/public/js/theme-init.js',
    routes: '*',
    position: 'head',
  },
  // Blog only
  {
    src: '/public/js/blog.js',
    routes: ['/blog', '/blog/*'],
    position: 'body',
    type: 'module',
  },
  // Preload for faster discovery
  {
    src: '/public/js/analytics.js',
    routes: '*',
    position: 'head',
    type: 'module',
    preload: true,
  },
]
```

---

## CSS

### 1. Pattern CSS (one block per page, inlined & minified)

Every pattern can have a `<style>` block. The engine:

1. **Extracts** all pattern `<style>` content when inlining patterns.
2. **Keys by pattern name** (e.g. `hero`, `install-tree`), so the same pattern’s CSS is only stored once even if the pattern is used multiple times.
3. **Combines** all unique CSS into **one `<style>`** and injects it into **`{{headExtras}}`** (in the head).
4. **Minifies** that block when `config.minify.css` is true.

So: no duplicate pattern CSS, no extra requests, one place in the head for fast parsing and painting. Pattern HTML is inlined without `<style>` tags; the CSS lives only in the head.

---

### 2. Config styles (`config.styles`)

Use `config.styles` for global or route-specific stylesheets (and preloads, fonts, etc.).

| Option | Type | Default | Description |
|--------|------|--------|-------------|
| `href` | string | **required** | Path to the asset (e.g. `'/public/css/style.css'`). |
| `routes` | `string` or `string[]` | **required** | Same as scripts: `'*'`, exact path, or `'/blog/*'`. |
| `position` | `'head'` \| `'critical'` | `'head'` | Injected into `{{criticalPath}}` (critical, above `{{headExtras}}`) or `{{headExtras}}` (head). |
| `rel` | string | `'stylesheet'` | `'stylesheet'` or `'preload'`. |
| `as` | string | — | For preload: `'style'`, `'font'`, etc. |
| `media` | string | `'all'` | Media query for the stylesheet. |
| `async` | boolean | false | Non-blocking load. |
| `inline` | boolean | false | Inline the file contents into a `<style>` tag. |
| `noscript` | boolean | true | If preload/async: add `<noscript><link rel="stylesheet" ...></noscript>` fallback. |
| `attrs` | object | {} | Extra attributes (e.g. `crossorigin` for fonts). |

**Examples**

```js
styles: [
  // Preload then load
  {
    href: '/public/css/style.css',
    routes: '*',
    rel: 'preload',
    as: 'style',
  },
  {
    href: '/public/css/style.css',
    routes: '*',
    rel: 'stylesheet',
  },
  // Font preload
  {
    href: '/public/fonts/inter.woff2',
    routes: '*',
    rel: 'preload',
    as: 'font',
    attrs: { type: 'font/woff2', crossorigin: 'anonymous' },
  },
]
```

---

## Route matching

Used for both `scripts` and `styles`:

| `routes` value | Meaning |
|----------------|--------|
| `'*'` | Every page. |
| `'/about'` | Only the `/about` page. |
| `'/blog/*'` | `/blog` and any path under it (e.g. `/blog/post-1`). |

You can pass an array: `routes: ['/', '/about', '/blog/*']`.

---

## Minification

In `src/config.js`:

```js
minify: {
  css: true,
  js:  true,
}
```

- **CSS**: Minifies built `.css` files and the **combined pattern CSS** that gets inlined in the head.
- **JS**: Minifies `.js`/`.mjs` (components, public, islands). Preserves string literals and CSS custom properties; strips comments and collapses whitespace.

Applied at **build** time (`noc build`).

---

## Head / body order (what gets injected where)

**Critical (above head, `{{criticalPath}}`):**  
Styles and scripts with `position: 'critical'` — injected first for load-order control (e.g. blocking critical CSS).

**Head (`{{headExtras}}`):**

1. Component **modulepreload** links + **one script** that imports all components.
2. **One inline `<style>`** with all pattern CSS (deduped, optionally minified).
3. User **styles** from `config.styles` (for current route; non-critical).
4. User **scripts** from `config.scripts` with `position: 'head'`.

**Body (before `</body>`):**

1. **`{{bodyExtras}}`**: scripts from `config.scripts` with `position: 'body'`.
2. **`{{islandScript}}`**: island hydration (merged runtime + island map inlined when the page uses hydrate patterns and `config.hydrateIslands` is on).

---

## Summary

- **Components**: Declare in frontmatter; engine dedupes and emits one preload + one import script per component per page.
- **Pattern CSS**: Extracted, deduped by pattern name, one inline block in head, minified when `minify.css` is on.
- **Scripts/Styles**: Full control via `config.scripts` and `config.styles` in `src/config.js` (routes, position: critical/head/body, defer/async/preload/inline, attrs) so you load only what each page needs and in the right order.

That’s how you get component-first performance with no duplicate imports and minimal, fast-loading CSS and JS.

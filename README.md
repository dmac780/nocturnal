# nocturnal framework

https://github.com/dmac780  
https://web.dev/articles/declarative-shadow-dom  
https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_shadow_DOM  
https://github.com/dmac780/nocturnal-components

Nocturnal is a native web component framework designed to optimize the delivery of web components in HTML. No virtual DOM, no extra diffing. Optimized HTML, modern browser preloading techniques, and targeted hydration. Major focus on Declarative Shadow DOM (DSD) and serving as static (SSG) or on-demand (SSR). You can use 50+ curated components from core to start building right away, or build your own.

This is a very competent framework in a sense that everything you need to know is either native to browsers or node. This requires raw JavaScript to interact with `HTMLElement`, and native CSS/Grid to control your layouts and templates. The rest is handled by the framework to optimize how things are delivered. There is built in minification and the ability to process styles inline or asynchronously deliver assets to remove render blocking from pages, limit network requests in the critical path, and dramatically increase the painting speed of browsers -- with native web components being the star of the show. 

Build patterns with multiple web components, and render them with dynamic hydration. Don't worry about duplicate component imports, as the engine automatically strips duplicate component imports even when they are included through patterns or defined more than once.

# Nocturnal.js is under development

You need at least Node.js 18

You can install with:
```bash
npm install github:dmac780/nocturnal
```
this installs `Nocturnal` and `nocturnal-components` in node_modules.

The CLI is `noc` (from the package `bin`).

```bash
# 1. Scaffold a new project (creates src/ from bootstrap; safe, won't overwrite)
noc create demo

or

noc create naked

# 2. Build
noc build

# 3. Preview
noc serve
```

Other commands: `noc watch` (dev mode: build and rebuild on file changes).


### Why DSD and no-JS fallback:
With JS off, custom elements never run and the component doesn’t render. Nocturnal solves that by letting components opt in to an `ssrTemplate()` that returns declarative shadow DOM. The renderer finds those tags in the HTML, dynamically imports the component, calls `ssrTemplate()`, and injects the shadow DOM into the page. So the component is visible even without JavaScript running clientside.

### How the rendering pipeline works.
One renderer drives both SSG and SSR. For each page we parse frontmatter (layout, title, components), resolve `<noc-pattern src="...">` by inlining `src/patterns/*.html` at build or request time, and merge in the layout. Component refs (`@core:button`, `@user:thing`) become modulepreload + script tags. Critically, we only output code for what’s declared on that page: component preloads and island scripts are collected from the page and its inlined patterns, duplicates are removed, and only that lean set is emitted. So a page that uses two islands gets two island scripts, not the whole app. Styles and scripts from config are filtered by route and injected into the right slots (example: critical path)

### Islands.
 Patterns can set `hydrate: true` and put their logic in `<script data-island-extract>`. The build (or SSR) extracts those scripts into an island map and strips them from the pattern body. Each pattern is wrapped in a `data-island="name"` div. Only the islands that actually appear on the current page get their script inlined (or loaded from island-build.js in SSG); duplication is removed so you never ship the same island twice. The client runs a small runtime that hydrates each island by strategy: `client:load`, `client:visible`, or `client:idle`. Optional `lazy-html: true` defers pattern HTML until the island hydrates, then fetches it and runs the script. Interactive islands without a monolithic bundle.

### SSR vs SSG.
 Same `renderPage()` and layout/pattern logic. With SSR we run that on each request, optionally compress the response, and handle `/api/*` with a small route layer. With SSG we pre-render every page to disk. Either way, DSD is injected so components render without JS; with JS they attach to the existing shadow roots.

### API (backend).
When SSR is on, `/api/*` is handled by files under `src/api/`: static routes map directly (`src/api/foo.js` → `/api/foo`), dynamic use brackets (`src/api/users/[id].js`). Handlers receive a context (parsed body, query, headers, params, cookies, setCookie/clearCookie) and return via helpers: `json(data, status?)`, `redirect(url, status?)`, `error(message, status?)`, `send(body, contentType?, status?)`. Enough for forms, webhooks, and small endpoints. Plan is to add data providers and adapters (DB, auth, etc.) so you plug in backends without hand-rolling everything; reactive state over WebSockets for island reactivity is on the radar.

### Deployment.
SSR runs in a Node process; you serve through Node for now (Bun may follow). For SSG, build outputs to `dist/`. You can optionally keep a git repo inside `dist/` and push that for quick deploys (e.g. GitHub Pages, Netlify static); the build doesn’t wipe the directory, so your git history stays intact. Handy for lazy one-repo setups.

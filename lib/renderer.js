/*========================================================
 renderer.js - Core SSG rendering engine for Nocturnal.

 Handles: frontmatter parsing
          component resolution
          pattern inclusion
          layout injection
==========================================================*/

import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { minifyCSS, minifyJS } from './minifier.js';


/*========================================================
FRONTMATTER PARSER 
==========================================================*/

/**
 * Parse YAML-style frontmatter from a file string.
 * Supports strings, booleans, numbers, and simple string arrays.
 *
 * ---
 * layout: default
 * title: My Page
 * components:
 *   - @core:card
 *   - @user:UI/select
 * ---
 *
 * @param {string} src - Raw file content
 * @returns {{ data: object, content: string }}
 */
export function parseFrontmatter(src) {

  const FM_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;
  const match = src.match(FM_RE);

  if (!match) {
    return { data: {}, content: src };
  }

  const raw     = match[1];
  const content = src.slice(match[0].length);
  const data    = {};

  let currentKey = null;
  let inArray    = false;

  for (const line of raw.split(/\r?\n/)) {
    // Array item
    if (inArray && /^\s+-\s+/.test(line)) {
      data[currentKey].push(line.replace(/^\s+-\s+/, '').trim());
      continue;
    }

    // Key: value  OR  Key:  (start of block array)
    const kvMatch = line.match(/^(\w[\w-]*):\s*(.*)/);
    if (kvMatch) {
      inArray    = false;
      currentKey = kvMatch[1];
      
      const val = kvMatch[2].trim();

      if (val === '') {
        // No inline value — next lines may be an array
        data[currentKey] = [];
        inArray = true;
      } else if (val === 'true') {
        data[currentKey] = true;
      } else if (val === 'false') {
        data[currentKey] = false;
      } else if (!isNaN(Number(val)) && val !== '') {
        data[currentKey] = Number(val);
      } else {
        data[currentKey] = val;
      }
    }
  }

  return { data, content };
}


/*========================================================
COMPONENT PATH RESOLUTION 
==========================================================*/

/**
 * Resolve a component declaration to its public JS URL path.
 *
 * @core:card          → /lunadom/components/card/card.js
 * @user:UI/select     → /components/UI/select.js
 */
export function resolveComponentPath(declaration) {

  if (declaration.startsWith('@core:')) {
    const name = declaration.slice('@core:'.length);
    return `/nocturnal-components/components/${name}/${name}.js`;
  }

  if (declaration.startsWith('@user:')) {
    const userPath = declaration.slice('@user:'.length);
    return `/components/${userPath}.js`;
  }

  // bare tag name → src/components/<name>.js
  if (!declaration.includes(':')) {
    return `/components/${declaration}.js`;
  }

  throw new Error(`Unknown component prefix in declaration: "${declaration}"`);
}


/**
 * Build favicon <link> tags from config.favicon.
 * Only injects tags for formats that have a non-empty path.
 * Injected into criticalPath so favicons load before anything else.
 *
 * @param {object} faviconConfig - config.favicon
 * @param {string} baseURL
 * @returns {string}
 */
export function buildFaviconTags(faviconConfig = {}, baseURL = '/') {
  if (!faviconConfig?.enabled) return '';

  const base = baseURL.endsWith('/') ? baseURL : baseURL + '/';
  const prefix = (p) => p ? (p.startsWith('/') ? base + p.slice(1) : p) : null;

  const tags = [];

  if (faviconConfig.svg) {
    tags.push(`  <link rel="icon" type="image/svg+xml" href="${prefix(faviconConfig.svg)}">`);
  }
  if (faviconConfig.png) {
    tags.push(`  <link rel="icon" type="image/png" href="${prefix(faviconConfig.png)}">`);
  }
  if (faviconConfig.ico) {
    tags.push(`  <link rel="shortcut icon" href="${prefix(faviconConfig.ico)}">`);
  }
  if (faviconConfig.appleTouchIcon) {
    tags.push(`  <link rel="apple-touch-icon" href="${prefix(faviconConfig.appleTouchIcon)}">`);
  }
  if (faviconConfig.manifest?.enabled && faviconConfig.manifest.path) {
    tags.push(`  <link rel="manifest" href="${prefix(faviconConfig.manifest.path)}">`);
    if (faviconConfig.manifest.themeColor) {
      tags.push(`  <meta name="theme-color" content="${faviconConfig.manifest.themeColor}">`);
    }
  }

  return tags.join('\n');
}


/**
 * Build <link rel="modulepreload"> tags + a <script type="module"> that actually
 * imports each component so the custom element registers in the browser.
 *
 * modulepreload alone only fetches, it doesn't execute.
 * The import() calls in the script block trigger customElements.define().
 *
 * @param {string[]} components
 * @param {string} [baseURL='/'] - Prefix for all asset hrefs (e.g. '/my-repo/' for GH Pages)
 */
export function buildPreloadTags(components = [], baseURL = '/') {

  if (!components.length) {
    return '';
  }

  const base = baseURL.endsWith('/') ? baseURL : baseURL + '/';

  const hrefs = components.map((decl) => {
    const href = resolveComponentPath(decl);
    return base + href.replace(/^\//, '');
  });

  const preloads = hrefs
    .map((href) => `  <link rel="modulepreload" href="${href}">`)
    .join('\n');

  const imports = hrefs
    .map((href) => `  import '${href}';`)
    .join('\n');

  const script = `  <script type="module">\n${imports}\n  </script>`;

  return `${preloads}\n${script}`;
}


/*========================================================
ASSET INJECTION (CSS/JS FROM CONFIG) 
==========================================================*/

/**
 * Check if a route pattern matches the current page route.
 * Supports wildcards: '*' matches all, '/blog/*' matches /blog/anything
 * 
 * @param {string|string[]} routePattern - Route or array of routes from config
 * @param {string} currentRoute - Current page route (e.g. '/', '/about', '/blog/post-1')
 * @returns {boolean}
 */
export function matchesRoute(routePattern, currentRoute) {

  if (routePattern === '*') {
    return true;
  }
  
  const patterns = Array.isArray(routePattern) ? routePattern : [routePattern];
  
  for (const pattern of patterns) {
    if (pattern === '*') {
      return true;
    }

    if (pattern === currentRoute) {
      return true;
    }
    
    // Wildcard matching: /blog/* matches /blog/anything
    if (pattern.endsWith('/*')) {
      const base = pattern.slice(0, -2);
      if (currentRoute === base || currentRoute.startsWith(base + '/')) {
        return true;
      }
    }
  }
  
  return false;
}


/**
 * Build CSS link tags from user config.styles array.
 * Filters by route and generates appropriate link tags with rel, as, media, async attributes.
 * Supports inline CSS injection and noscript fallbacks.
 * 
 * @param {Array} styles - Array of style config objects from src/config.js
 * @param {string} currentRoute - Current page route
 * @param {string} [baseURL='/'] - Base URL prefix
 * @param {string} [rootDir=''] - Root directory (project root); inline paths resolved from rootDir/src/
 * @param {boolean} [minifyInlineCss=false] - When true, minify inlined CSS
 * @returns {string} - HTML link/style tags
 */
export function buildStyleTags(styles = [], currentRoute = '/', baseURL = '/', rootDir = '', minifyInlineCss = false) {

  if (!styles.length) {
    return '';
  }

  const base = baseURL.endsWith('/') ? baseURL : baseURL + '/';
  const tags = [];
  
  for (const style of styles) {
    if (!matchesRoute(style.routes, currentRoute)) {
      continue;
    }
    
    // Handle inline CSS (reads from rootDir/src/... to match config href /public/...)
    if (style.inline) {
      try {
        const cssPath = path.join(rootDir, 'src', style.href.replace(/^\//, ''));
        if (fs.existsSync(cssPath)) {
          let cssContent = fs.readFileSync(cssPath, 'utf8');
          if (minifyInlineCss) {
            cssContent = minifyCSS(cssContent);
          }
          tags.push(`<style>${cssContent}</style>`);
        } else {
          console.warn(`[nocturnal] Inline CSS not found: ${cssPath}`);
        }
      } catch (err) {
        console.warn(`[nocturnal] Failed to inline CSS ${style.href}: ${err.message}`);
      }
      continue;
    }
    
    const href     = base + style.href.replace(/^\//, '');
    const rel      = style.rel || 'stylesheet';
    const media    = style.media || 'all';
    const noscript = style.noscript !== false; // Default true
    
    let tag = `<link rel="${rel}" href="${href}"`;
    
    // Add as= attribute for preload
    if (style.as) {
      tag += ` as="${style.as}"`;
    }
    
    // Add media attribute for stylesheets
    if (rel === 'stylesheet') {
      tag += ` media="${media}"`;
    }
    
    // Add async attribute for non-blocking load
    if (style.async) {
      tag += ` async`;
    }
    
    // Add any custom attributes from attrs object
    if (style.attrs && typeof style.attrs === 'object') {
      for (const [key, value] of Object.entries(style.attrs)) {
        if (value === true) {
          tag += ` ${key}`;
        } else if (value !== false && value != null) {
          tag += ` ${key}="${value}"`;
        }
      }
    }
    
    tag += '>';
    tags.push(tag);
    
    // Add noscript fallback for async/preloaded stylesheets
    if (noscript && (style.async || rel === 'preload')) {
      tags.push(`<noscript><link rel="stylesheet" href="${href}" media="${media}"></noscript>`);
    }
  }
  
  return tags.length ? '  ' + tags.join('\n  ') : '';
}


/**
 * Build script tags from user config.scripts array.
 * Filters by route and position, generates appropriate script tags with type, defer, async attributes.
 * Supports inline JS injection and custom attributes.
 * 
 * @param {Array} scripts - Array of script config objects from src/config.js
 * @param {string} currentRoute - Current page route
 * @param {string} position - 'head' or 'body'
 * @param {string} [baseURL='/'] - Base URL prefix
 * @param {string} [rootDir=''] - Root directory for resolving inline JS files
 * @returns {string} - HTML script tags (and optional modulepreload links)
 */
export function buildScriptTags(scripts = [], currentRoute = '/', position = 'head', baseURL = '/', rootDir = '') {

  if (!scripts.length) {
    return '';
  }

  const base = baseURL.endsWith('/') ? baseURL : baseURL + '/';
  const tags = [];
  
  for (const script of scripts) {
    if (!matchesRoute(script.routes, currentRoute)) {
      continue;
    }
    
    if ((script.position || 'head') !== position) {
      continue;
    }
    
    // Handle inline JS (reads from rootDir/src/... to match config src /public/...)
    if (script.inline) {
      try {
        const jsPath = path.join(rootDir, 'src', script.src.replace(/^\//, ''));
        if (fs.existsSync(jsPath)) {
          const jsContent = fs.readFileSync(jsPath, 'utf8');
          let tag = '<script';
          if (script.type) {
            tag += ` type="${script.type}"`;
          }
          tag += `>${jsContent}</script>`;
          tags.push(tag);
        } else {
          console.warn(`[nocturnal] Inline JS not found: ${jsPath}`);
        }
      } catch (err) {
        console.warn(`[nocturnal] Failed to inline JS ${script.src}: ${err.message}`);
      }
      continue;
    }
    
    const src = base + script.src.replace(/^\//, '');
    
    // Add modulepreload link if requested (only in head)
    if (script.preload && position === 'head') {
      tags.push(`<link rel="modulepreload" href="${src}">`);
    }
    
    let tag = `<script src="${src}"`;
    
    if (script.type) {
      tag += ` type="${script.type}"`;
    }
    
    if (script.defer && !script.async) {
      tag += ' defer';
    }
    
    if (script.async) {
      tag += ' async';
    }
    
    // Add any custom attributes from attrs object
    if (script.attrs && typeof script.attrs === 'object') {
      for (const [key, value] of Object.entries(script.attrs)) {
        if (value === true) {
          tag += ` ${key}`;
        } else if (value !== false && value != null) {
          tag += ` ${key}="${value}"`;
        }
      }
    }
    
    tag += '></script>';
    tags.push(tag);
  }
  
  return tags.length ? '  ' + tags.join('\n  ') : '';
}


/*========================================================
STATIC PATTERN INJECTION (BUILD-TIME SSG INCLUDES) 
==========================================================*/

/**
 * Strip only <script data-island-extract>...</script> from HTML (extracted at build into island-build.js).
 * @param {string} html
 * @returns {string}
 */
function stripIslandScripts(html) {
  return html.replace(/<script\s[^>]*data-island-extract[^>]*>[\s\S]*?<\/script>/gi, '').trim();
}


/**
 * SSG-time pattern inclusion system.
 * 
 * Replaces <noc-pattern src="hero"></noc-pattern> OR <noc-pattern src="hero" />
 * with contents of src/patterns/hero.html at BUILD TIME.
 * 
 * Patterns can have frontmatter:
 *   components: [...]  - component dependencies
 *   hydrate: true     - wrap in data-island; <script data-island-extract> extracted at build into island-build.js
 *   island: "name"    - data-island value (default: pattern name, e.g. install-tree)
 *   strategy: "client:visible" | "client:idle" | "client:load"  - hydration strategy (default: client:load)
 *   lazy-html: true   - emit placeholder + store full HTML for lazy loading (HTML fetched when island hydrates)
 * 
 * When hydrate is true, <script data-island-extract> is stripped from the pattern body (extracted at build into island-build.js).
 * 
 * @param {string} html - Page HTML content
 * @param {string} patternsDir - Path to patterns directory
 * @param {Set} componentSet - Set to collect all component dependencies
 * @param {Array} hydratePatterns - Optional array to collect { name, strategy } for hydrate patterns
 * @param {Map<string, string>} extractedStyles - Optional Map (id -> css) to collect pattern CSS for head; style blocks are stripped from inlined body
 * @param {Map<string, string>} lazySections - Optional Map (pattern-name -> html) to collect lazy section HTML
 * @returns {string} - HTML with patterns inlined
 */
export function inlineStaticPatterns(html, patternsDir, componentSet = null, hydratePatterns = null, extractedStyles = null, lazySections = null, userConfig = null, pageContext = {}) {

  // Match both self-closing and paired tags: 
  // <noc-pattern src="x" /> or <noc-pattern src="x"></noc-pattern>
  const PATTERN_RE = /<noc-pattern\s+src=["']([^"']+)["']\s*(?:\/>|><\/noc-pattern>)/g;
  const STYLE_RE   = /<style[^>]*>([\s\S]*?)<\/style>/gi;

  return html.replace(PATTERN_RE, (_match, src) => {
    const baseName = src.endsWith('.html') ? src.slice(0, -5) : src;
    const filePath = path.join(patternsDir, baseName + '.html');

    if (!fs.existsSync(filePath)) {
      console.warn(`[nocturnal] Pattern not found: ${filePath}`);
      return `<!-- pattern not found: ${src} -->`;
    }

    const patternContent = fs.readFileSync(filePath, 'utf8');
    const { data: patternFrontmatter, content: patternBody } = parseFrontmatter(patternContent);

    if (componentSet && patternFrontmatter.components && Array.isArray(patternFrontmatter.components)) {
      for (const comp of patternFrontmatter.components) {
        componentSet.add(comp);
      }
    }

    const hydrate  = patternFrontmatter.hydrate === true;
    const lazyHtml = patternFrontmatter['lazy-html'] === true;

    let body = patternBody.trim();

    // Extract <style> blocks into extractedStyles
    // (keyed by pattern name), strip from body
    if (extractedStyles != null && typeof extractedStyles.set === 'function') {
      body = body.replace(STYLE_RE, (_match, content) => {
        if (!extractedStyles.has(baseName)) {
          extractedStyles.set(baseName, content.trim());
        }
        return '';
      });
    }

    // Build pattern context: start with page context, then merge pattern's own inline <script> data
    let patternContext = { ...pageContext };
    const patternScriptRe = /<script[^>]*>\s*(?:const|let|var)?\s*(\w+)\s*=\s*(\{[\s\S]*?\});?\s*<\/script>/gi;
    let scriptMatch;
    while ((scriptMatch = patternScriptRe.exec(body)) !== null) {
      const [fullMatch, , jsonLike] = scriptMatch;
      try {
        const parsed = Function(`"use strict"; return (${jsonLike})`)();
        patternContext = { ...patternContext, ...parsed };
        body = body.replace(fullMatch, '');
      } catch (err) {
        console.warn(`[nocturnal] Failed to parse inline data script in pattern ${baseName}: ${err.message}`);
      }
    }

    // Apply template rendering if there is any context
    if (Object.keys(patternContext).length > 0) {
      body = renderTemplate(body, patternContext);
    }

    // Minify inline <script> tags IF minification is enabled
    // but NOT data-island-extract scripts, they're handled separately
    if (userConfig?.minify?.js) {
      const INLINE_SCRIPT_RE = /<script(?![^>]*data-island-extract)([^>]*)>([\s\S]*?)<\/script>/gi;

      body = body.replace(INLINE_SCRIPT_RE, (fullMatch, attrs, scriptContent) => {
        try {
          const minified = minifyJS(scriptContent);        
          return `<script${attrs}>${minified}</script>`;
        } catch (err) {
          console.warn(`[nocturnal] Failed to minify inline script in pattern ${baseName}: ${err.message}`);
          return fullMatch;
        }
      });
    }

    if (hydrate) {
      body = stripIslandScripts(body);

      const islandName = patternFrontmatter.island || baseName;
      const strategy   = patternFrontmatter.strategy || 'client:load';

      if (Array.isArray(hydratePatterns)) {
        if (!hydratePatterns.find(p => p.name === islandName)) {
          hydratePatterns.push({ name: islandName, strategy });
        }
      }
      
      // Wrap body in data-island wrapper
      const wrappedBody = `<div data-island="${islandName}" data-strategy="${strategy}">\n${body}\n</div>`;
      
      // If lazy-html is enabled emit placeholder with data-src and store full HTML
      // Islands system will fetch HTML first then hydrate JS
      if (lazyHtml && lazySections != null) {
        lazySections.set(baseName, wrappedBody);
        return `<div data-island="${islandName}" data-strategy="${strategy}" data-src="/partials/${baseName}.html"><!-- Island HTML loads on ${strategy} --></div>`;
      }
      
      return wrappedBody;
    }

    return body;
  });
}


/*========================================================
TEMPLATE ENGINE (LOOPS + CONDITIONALS)
==========================================================*/

/**
 * Render template with data context: supports {{var}}, {{#each items}}, {{#if condition}}, {{else}}, nesting.
 * Properly handles nested blocks by matching balanced tags.
 * @param {string} template
 * @param {object} context
 * @returns {string}
 */
export function renderTemplate(template, context = {}) {
  let html = template;

  // Helper: find the matching closing tag for a block, respecting nesting
  function findClosingTag(str, startPos, openTag, closeTag) {
    let depth = 1;
    let pos = startPos;
    const openRe = new RegExp(openTag, 'g');
    const closeRe = new RegExp(closeTag, 'g');
    
    while (depth > 0 && pos < str.length) {
      openRe.lastIndex = pos;
      closeRe.lastIndex = pos;
      
      const nextOpen = openRe.exec(str);
      const nextClose = closeRe.exec(str);
      
      if (!nextClose) return -1;
      
      if (nextOpen && nextOpen.index < nextClose.index) {
        depth++;
        pos = nextOpen.index + nextOpen[0].length;
      } else {
        depth--;
        if (depth === 0) return nextClose.index;
        pos = nextClose.index + nextClose[0].length;
      }
    }
    return -1;
  }

  // Process {{#each}} blocks (innermost first via recursion)
  const eachRe = /\{\{#each\s+(\w+)\}\}/g;
  let match;
  while ((match = eachRe.exec(html)) !== null) {
    const arrayName = match[1];
    const startPos = match.index;
    const contentStart = match.index + match[0].length;
    const endPos = findClosingTag(html, contentStart, '\\{\\{#each\\s+\\w+\\}\\}', '\\{\\{\\/each\\}\\}');
    
    if (endPos === -1) break;
    
    const block = html.substring(contentStart, endPos);
    const arr = context[arrayName];
    const rendered = Array.isArray(arr) 
      ? arr.map(item => renderTemplate(block, { ...context, ...item })).join('')
      : '';
    
    html = html.substring(0, startPos) + rendered + html.substring(endPos + '{{/each}}'.length);
    eachRe.lastIndex = 0; // Reset regex after modification
  }

  // Process {{#if}} blocks (innermost first via recursion)
  const ifRe = /\{\{#if\s+(\w+)\}\}/g;
  while ((match = ifRe.exec(html)) !== null) {
    const condName = match[1];
    const startPos = match.index;
    const contentStart = match.index + match[0].length;
    const endPos = findClosingTag(html, contentStart, '\\{\\{#if\\s+\\w+\\}\\}', '\\{\\{\\/if\\}\\}');
    
    if (endPos === -1) break;
    
    const blockContent = html.substring(contentStart, endPos);
    const elseMatch = blockContent.match(/^([\s\S]*?)\{\{else\}\}([\s\S]*)$/);
    
    const ifBlock = elseMatch ? elseMatch[1] : blockContent;
    const elseBlock = elseMatch ? elseMatch[2] : '';
    
    const val = context[condName];
    const truthy = Array.isArray(val) ? val.length > 0 : !!val;
    const rendered = truthy ? renderTemplate(ifBlock, context) : renderTemplate(elseBlock, context);
    
    html = html.substring(0, startPos) + rendered + html.substring(endPos + '{{/if}}'.length);
    ifRe.lastIndex = 0; // Reset regex after modification
  }

  // Replace {{var}} with context values
  html = html.replace(/\{\{(\w+)\}\}/g, (_, varName) => {
    const val = context[varName];
    return val !== undefined && val !== null ? String(val) : '';
  });

  return html;
}


/*========================================================
LAYOUT INJECTION 
==========================================================*/

/**
 * Inject content + criticalPath + headExtras + bodyExtras into a layout template.
 * Replaces {{title}}, {{content}}, {{criticalPath}}, {{headExtras}}, {{bodyExtras}} and any custom frontmatter tokens.
 *
 * @param {string} layoutHtml
 * @param {{ title: string, content: string, criticalPath: string, headExtras: string, bodyExtras: string, [key: string]: string }} vars
 */
export function applyLayout(layoutHtml, vars) {

  const { title = '', content = '', criticalPath = '', headExtras = '', bodyExtras = '', ...rest } = vars;

  let out = layoutHtml
    .replace(/\{\{title\}\}/g, title)
    .replace(/\{\{content\}\}/g, content)
    .replace(/\{\{criticalPath\}\}/g, criticalPath)
    .replace(/\{\{headExtras\}\}/g, headExtras)
    .replace(/\{\{bodyExtras\}\}/g, bodyExtras);

  // Replace any additional frontmatter variables
  for (const [key, val] of Object.entries(rest)) {
    if (typeof val === 'string' || typeof val === 'number') {
      out = out.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(val));
    }
  }

  // Remove any remaining unreplaced tokens (for optional frontmatter fields)
  out = out.replace(/\{\{[^}]+\}\}/g, '');

  return out;
}


/*========================================================
PAGE RENDERER 
==========================================================*/

/**
 * Render a single page file to final HTML.
 *
 * @param {string} pageFile   - Absolute path to the .html page source
 * @param {object} dirs       - { layoutsDir, patternsDir, baseURL, userConfig, currentRoute, rootDir }
 * @returns {Promise<{ html: string, lazySections: Map }>}  - Rendered HTML and lazy sections
 */
export async function renderPage(pageFile, { layoutsDir, patternsDir, baseURL = '/', userConfig = null, currentRoute = '/', rootDir = '' }) {
  
  const raw = fs.readFileSync(pageFile, 'utf8');
  const { data: frontmatter, content: pageBody } = parseFrontmatter(raw);

  const {
    layout = 'default',
    title = '',
    components = [],
    ...extraVars
  } = frontmatter;

  const componentSet = new Set(Array.isArray(components) ? components : []);
  const hydratePatterns = [];

  const extractedStyles = new Map();
  const lazySections = new Map();

  // 1. Page context: prefer sibling pageName.server.js load(), else inline <script> data
  let pageContext = {};
  let rawPageBody = pageBody.trim();

  const pageDir = path.dirname(pageFile);
  const pageBase = path.basename(pageFile, '.html');
  const serverPath = path.join(pageDir, pageBase + '.server.js');

  if (fs.existsSync(serverPath)) {
    try {
      const serverUrl = pathToFileURL(serverPath).href;
      const mod = await import(serverUrl);
      if (typeof mod.load === 'function') {
        const result = mod.load();
        pageContext = result && typeof result.then === 'function' ? await result : (result || {});
      }
    } catch (err) {
      console.warn(`[nocturnal] Failed to load page server module ${serverPath}: ${err.message}`);
    }
  }

  if (Object.keys(pageContext).length === 0) {
    const scriptDataRe = /<script[^>]*>\s*(?:const|let|var)?\s*(\w+)\s*=\s*(\{[\s\S]*?\});?\s*<\/script>/gi;
    let match;
    while ((match = scriptDataRe.exec(rawPageBody)) !== null) {
      const [fullMatch, , jsonLike] = match;
      try {
        const parsed = Function(`"use strict"; return (${jsonLike})`)();
        pageContext = { ...pageContext, ...parsed };
        rawPageBody = rawPageBody.replace(fullMatch, '');
      } catch (err) {
        console.warn(`[nocturnal] Failed to parse inline data script: ${err.message}`);
      }
    }
  } else {
    // When using .server.js, strip inline data scripts so they don't appear in output
    rawPageBody = rawPageBody.replace(/<script[^>]*>\s*(?:const|let|var)?\s*\w+\s*=\s*(\{[\s\S]*?\});?\s*<\/script>/gi, '');
  }

  // 1b. Inline static patterns in page body, passing page context so patterns can use {{#if}}/{{#each}}
  let resolvedBody = inlineStaticPatterns(rawPageBody, patternsDir, componentSet, hydratePatterns, extractedStyles, lazySections, userConfig, pageContext);

  // 1c. Apply template rendering to the page body itself with page context
  if (Object.keys(pageContext).length > 0) {
    resolvedBody = renderTemplate(resolvedBody, pageContext);
  }

  // 2. Load layout
  const layoutFile = path.join(layoutsDir, `${layout}.html`);
  if (!fs.existsSync(layoutFile)) {
    throw new Error(`[nocturnal] Layout not found: ${layoutFile}`);
  }

  let layoutHtml = fs.readFileSync(layoutFile, 'utf8');

  layoutHtml = inlineStaticPatterns(layoutHtml, patternsDir, componentSet, hydratePatterns, extractedStyles, lazySections, userConfig, pageContext);

  // 3. Build preload tags for all collected components
  // page + patterns + layout patterns
  const allComponents = Array.from(componentSet);
  
  let headExtras = buildPreloadTags(allComponents, baseURL);

  // 3b. Single inline <style> in head from all pattern CSS
  // deduped by pattern name, minified when config.minify.css is on
  if (extractedStyles.size > 0) {
    let patternCSS = Array.from(extractedStyles.values()).join('\n');
    if (userConfig?.minify?.css) {
      patternCSS = minifyCSS(patternCSS);
    }
    headExtras += (headExtras ? '\n' : '') + '  <style>' + patternCSS + '</style>';
  }

  // 3c. Critical path: favicons + styles/scripts with position: 'critical'
  // injected above {{headExtras}} for load-order control
  let criticalPath = '';

  // Favicons go first in critical path
  if (userConfig?.favicon?.enabled) {
    const faviconTags = buildFaviconTags(userConfig.favicon, baseURL);
    if (faviconTags) {
      criticalPath += faviconTags;
    }
  }

  if (userConfig) {
    const criticalStyles    = (userConfig.styles || []).filter((s) => (s.position || 'head') === 'critical');
    const criticalScripts   = buildScriptTags(userConfig.scripts || [], currentRoute, 'critical', baseURL, rootDir);
    const criticalStyleTags = buildStyleTags(criticalStyles, currentRoute, baseURL, rootDir, userConfig?.minify?.css);

    if (criticalStyleTags) {
      criticalPath += (criticalPath ? '\n' : '') + criticalStyleTags;
    }

    if (criticalScripts) {
      criticalPath += (criticalPath ? '\n' : '') + criticalScripts;
    }
  }

  // 4. Add user-defined CSS and head scripts from config (non-critical)
  if (userConfig) {
    const headStyles     = (userConfig.styles || []).filter((s) => (s.position || 'head') !== 'critical');
    const styleTags      = buildStyleTags(headStyles, currentRoute, baseURL, rootDir, userConfig?.minify?.css);
    const headScriptTags = buildScriptTags(userConfig.scripts || [], currentRoute, 'head', baseURL, rootDir);
    
    if (styleTags) {
      headExtras += (headExtras ? '\n' : '') + styleTags;
    }
    
    if (headScriptTags) {
      headExtras += (headExtras ? '\n' : '') + headScriptTags;
    }
  }

  // 5. Build body scripts (bottom of page)
  let bodyExtras = '';
  if (userConfig) {
    const bodyScriptTags = buildScriptTags(userConfig.scripts || [], currentRoute, 'body', baseURL, rootDir);
    if (bodyScriptTags) {
      bodyExtras = bodyScriptTags;
    }
  }

  // 5b. Build island hydration script only when hydrateIslands is on and page uses hydrate patterns.
  // Inline only the islands used on this page (static-first: no script for install-tree on about page).
  let islandScript = '';
  if (hydratePatterns.length > 0 && userConfig?.hydrateIslands !== false) {
    const entries = global.__nocturnalIslandEntries || [];
    const runtime = global.__nocturnalIslandsRuntime || '';

    if (entries.length > 0 && runtime) {
      const namesOnPage = new Set(hydratePatterns.map((p) => p.name));
      const filtered = entries.filter((e) => namesOnPage.has(e.name));

      if (filtered.length > 0) {
        const scriptMapLines = filtered.map(
          ({ name, body }) => `  ${JSON.stringify(name)}: () => Promise.resolve(new Function(${JSON.stringify(body)})())`
        );
        const islandMapCode = `\nconst islandMap = {\n${scriptMapLines.join(',\n')}\n};\n\nif (Object.keys(islandMap).length > 0) {\n  hydrateIslands(islandMap);\n}\n`;
        const mergedCode = runtime + islandMapCode;
        islandScript = `<script type="module">\n${mergedCode}\n</script>`;
      }
    } else {
      const mergedCode = global.__nocturnalMergedIslandsCode || '';
      if (mergedCode) {
        islandScript = `<script type="module">\n${mergedCode}\n</script>`;
      } else {
        const base = baseURL.endsWith('/') ? baseURL : baseURL + '/';
        islandScript = `<script type="module">
  import { islandMap } from '${base}island-build.js';
  import { hydrateIslands } from '${base}islands.js';
  hydrateIslands(islandMap);
</script>`;
      }
    }
  }

  // 6. Apply layout with all frontmatter vars available as tokens
  return {
    html: applyLayout(layoutHtml, {
      title,
      content: resolvedBody,
      criticalPath,
      headExtras,
      bodyExtras,
      islandScript,
      ...extraVars
    }),
    lazySections
  };
}

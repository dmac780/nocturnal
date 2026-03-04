/**
 * ssr-renderer.js — Declarative Shadow DOM injection for SSR
 *
 * Components opt-in to SSR by exporting a named `ssrTemplate` function.
 * The renderer dynamically imports each component and calls ssrTemplate()
 * to get the declarative shadow DOM HTML.
 *
 * Component opt-in example (src/components/my-thing.js):
 *
 *   export function ssrTemplate(attrs, innerHTML) {
 *     return `
 *       <template shadowrootmode="open">
 *         <style>:host { display: block; }</style>
 *         <slot></slot>
 *       </template>
 *     `;
 *   }
 *
 * If a component does not export ssrTemplate, it is skipped (rendered as-is).
 * Nocturnal core components define their ssrTemplate inside their own file.
 */

import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

/**
 * Resolve a component tag name to its JS file path on disk.
 * Checks src/components/ and node_modules/lunadom/components/.
 *
 * @param {string} tagName - e.g. 'luna-button', 'custom-card'
 * @param {string} rootDir - project root
 * @returns {string|null} - absolute file path or null
 */
function resolveComponentFile(tagName, rootDir) {

  // noc-alert → nocturnal-components/components/alert/alert.js
  if (tagName.startsWith('noc-')) {
    const name = tagName.slice('noc-'.length);
    const p = path.join(rootDir, 'node_modules', 'nocturnal-components', 'components', name, `${name}.js`);

    if (fs.existsSync(p)) {
      return p;
    }
  }

  // src/components/my-component.js
  const userPath = path.join(rootDir, 'src', 'components', `${tagName}.js`);
  if (fs.existsSync(userPath)) {
    return userPath;
  }

  return null;
}

/**
 * Process HTML and inject declarative shadow DOM for any component
 * that exports an ssrTemplate() function.
 *
 * @param {string} html - Rendered page HTML
 * @param {string} rootDir - Project root directory
 * @returns {Promise<string>} - HTML with declarative shadow DOM injected
 */
export async function processSSRComponents(html, rootDir, context = 'ssr') {

  // Match both <tag>...</tag> and self-closing <tag />
  const COMPONENT_RE = /<([a-z]+-[a-z-]+)([^>]*?)(?:\s*\/>|>([\s\S]*?)<\/\1>)/gi;

  // Collect all unique tag names found in the HTML
  const found = new Map(); // tagName → Set of matches
  let m;
  const re = new RegExp(COMPONENT_RE.source, 'gi');

  while ((m = re.exec(html)) !== null) {
    const tag = m[1].toLowerCase();
    if (!found.has(tag)) {
      found.set(tag, []);
    }
    found.get(tag).push({ full: m[0], tag: m[1], attrs: m[2], inner: m[3] || '' });
  }

  if (!found.size) {
    return html;
  }

  const templates = new Map();

  // 1. src/ssr-templates.js — user-defined templates for third-party/core components
  const ssrTemplatesPath = path.join(rootDir, 'src', 'ssr-templates.js');
  if (fs.existsSync(ssrTemplatesPath)) {
    try {
      const mod = await import(pathToFileURL(ssrTemplatesPath).href);
      for (const [tag, fn] of Object.entries(mod.ssrTemplates || {})) {
        templates.set(tag, fn);
      }
    } catch (err) {
      console.warn(`[nocturnal/ssr] Could not load src/ssr-templates.js: ${err.message}`);
    }
  }

  // 2. ssrTemplate exported from the component's own file (src/components/)
  // Stub browser globals so component files can be imported in Node
  const hadHTMLElement = 'HTMLElement' in global;
  if (!hadHTMLElement) {
    global.HTMLElement = class {};
    global.customElements = { define: () => {} };
    global.window = global;
    global.document = { createElement: () => ({}) };
  }

  for (const tagName of found.keys()) {
    if (templates.has(tagName)) {
      continue;
    }

    const filePath = resolveComponentFile(tagName, rootDir);
    if (!filePath) {
      continue;
    }

    try {
      const mod = await import(pathToFileURL(filePath).href);
      if (typeof mod.ssrTemplate === 'function') {
        templates.set(tagName, mod.ssrTemplate);
        console.log(`[nocturnal/ssr] <${tagName}> has ssrTemplate`);
      } else {
        console.warn(`[nocturnal/ssr] <${tagName}> loaded from ${filePath} but no ssrTemplate export found. Exports: ${Object.keys(mod).join(', ')}`);
      }
    } catch (err) {
      console.warn(`[nocturnal/ssr] Could not load ${tagName}: ${err.message}`);
    }
  }

  if (!hadHTMLElement) {
    delete global.HTMLElement;
    delete global.customElements;
    delete global.window;
    delete global.document;
  }

  if (!templates.size) {
    return html;
  }

  // Replace component tags that have an ssrTemplate
  return html.replace(COMPONENT_RE, (match, tagName, attrsStr, innerHTML = '') => {
    const tag = tagName.toLowerCase();
    const ssrTemplate = templates.get(tag);

    if (!ssrTemplate) {
      return match;
    }

    // Parse attributes into an object
    const attrs = {};

    // Use a more robust regex that captures everything between quotes, including &quot;
    const attrMatches = attrsStr.matchAll(/(\w[\w-]*)=["']([^]*?)["']/g);
    
    // Decode HTML entities
    for (const [, key, val] of attrMatches) {
      attrs[key] = val.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    }

    // Boolean attributes (no value)
    for (const [, key] of attrsStr.matchAll(/\s([\w-]+)(?==["']|[\s>\/])/g)) {
      if (!(key in attrs)) {
        attrs[key] = true;
      }
    }

    console.log(`[nocturnal/ssr] Injecting declarative shadow DOM into <${tagName}>`);

    attrs['data-render'] = context;

    const shadowHTML = ssrTemplate(attrs, innerHTML);
    
    // Determine if original was self-closing
    const isSelfClosing = match.endsWith('/>');
    if (isSelfClosing) {
      return `<${tagName}${attrsStr}>${shadowHTML}</${tagName}>`;
    } else {
      return `<${tagName}${attrsStr}>${shadowHTML}${innerHTML}</${tagName}>`;
    }
  });
}

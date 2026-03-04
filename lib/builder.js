/**
 * builder.js — SSG build pipeline for Nocturnal
 * Walks src/pages/, renders each page, writes output to dist/
 * Copies user components, public assets, nocturnal components, and runtime to dist/ for serving.
 */

import fs from 'fs';
import path from 'path';
import { loadEnv } from './env.js';
import { renderPage, parseFrontmatter } from './renderer.js';
import { processSSRComponents } from './ssr-renderer.js';
import { minifyCopyDir, minifyCopyFile, minifyJS } from './minifier.js';
import { green, red, yellow } from './console-colors.js';


/** Extract first 
 * <script data-island-extract>...</script> body from HTML. 
 * @param {string} html
 * @returns {string|null}
 */
function extractIslandScript(html) {
  const re = /<script\s[^>]*data-island-extract[^>]*>([\s\S]*?)<\/script>/i;
  const m  = html.match(re);
  return m ? m[1].trim() : null;
}


/*==========================================
FILE UTILITIES
==========================================*/

/**
 * Recursively collect all files under a directory matching an optional extension.
 * @param {string} dir
 * @param {string} [ext] - e.g. '.html'
 * @returns {string[]}
 */
function collectFiles(dir, ext) {

  if (!fs.existsSync(dir)) {
    return [];
  }

  let entries; 

  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (err) {
    console.error(`[nocturnal] ${red('Error')} reading directory ${dir}: ${err.message} - collectFiles() -> fs.readdirSync()`);
    return [];
  }

  const files = [];

  for (const entry of entries) {

    try {
      const full = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        files.push(...collectFiles(full, ext));
      } else if (!ext || entry.name.endsWith(ext)) {
        files.push(full);
      }
    } catch (err) {
      console.error(`[nocturnal] ${red('Error')} reading file ${full}: ${err.message} - collectFiles() -> files.push()`);
    }

  }

  return files;
}


/*==========================================
ROUTING HELPERS
==========================================*/

/**
 * Map a src/pages/ file path to its output path in dist/.
 *
 * src/pages/index.html          → dist/index.html
 * src/pages/404.html            → dist/404.html (root for GitHub Pages)
 * src/pages/about.html          → dist/about/index.html  (clean URLs)
 * src/pages/blog/[slug].html    → dist/blog/[slug]/index.html (preserved as template)
 * @param {string} pageFile
 * @param {string} pagesDir
 * @param {string} outputDir
 * @returns {string}
 */
function pageToOutputPath(pageFile, pagesDir, outputDir) {

  if (typeof pageFile !== 'string' || typeof pagesDir !== 'string' || typeof outputDir !== 'string') {
    throw new TypeError('[nocturnal] pageToOutputPath() expects string arguments.');
  }

  const relative = path.relative(pagesDir, pageFile);
  const parsed   = path.parse(relative);

  let outRelative;

  // 404.html stays at root for GitHub Pages and other static hosts serving "dist/" directly.
  if (parsed.name === '404' && parsed.dir === '') {
    outRelative = '404.html';
  } else if (parsed.name === 'index') {
    outRelative = path.join(parsed.dir, 'index.html');
  } else {
    outRelative = path.join(parsed.dir, parsed.name, 'index.html');
  }

  return path.join(outputDir, outRelative);
}


/**
 * Convert a page file path to its public route for URL matching.
 * 
 * src/pages/index.html       → /
 * src/pages/about.html       → /about
 * src/pages/blog/post.html   → /blog/post
 * 
 * @param {string} pageFile
 * @param {string} pagesDir
 * @returns {string}
 */
function pageToRoute(pageFile, pagesDir) {

  if (typeof pageFile !== 'string' || typeof pagesDir !== 'string') {
    throw new TypeError('[nocturnal] pageToRoute() expects string arguments.');
  }

  const relative = path.relative(pagesDir, pageFile);
  const parsed   = path.parse(relative);
  
  if (parsed.name === 'index' && parsed.dir === '') {
    return '/';
  }
  
  if (parsed.name === 'index') {
    return '/' + parsed.dir.replace(/\\/g, '/');
  }
  
  const route = parsed.dir ? `${parsed.dir}/${parsed.name}` : parsed.name;
  return '/' + route.replace(/\\/g, '/');
}


/**
 * Returns true if the page path contains a dynamic segment like [slug].
 * @param {string} pageFile
 * @returns {boolean}
 */
function isDynamicRoute(pageFile) {
  return /\[.+?\]/.test(pageFile);
}


/*==========================================
BUILD
==========================================*/

/**
 * Run the full SSG build.
 *
 * Steps:
 *  1. Clean dist/
 *  2. Render all static pages from src/pages/ (uses config for assets)
 *  3. Copy src/components/ → dist/components/
 *  4. Copy src/public/      → dist/public/
 *  5. Copy lunadom package → dist/lunadom/
 *  6. Copy runtime/         → dist/runtime/
 *
 * @param {object} config - Nocturnal config object (already loaded from src/config.js by CLI)
 * @returns {{ built: string[], skipped: string[] }}
 */
export async function build(config) {
  const root = config.root || process.cwd();

  loadEnv(root);

  const pagesDir    = path.join(root, 'src', 'pages');
  const layoutsDir  = path.join(root, 'src', 'layouts');
  const patternsDir = path.join(root, 'src', 'patterns');
  const outputDir   = path.join(root, config.outputDir || 'dist');

  // Minification options derived from config
  const minify = config.minify || {};
  const minifyOpts = {
    css: minify.css === true,
    js:  minify.js  === true,
  };

  if (minifyOpts.css || minifyOpts.js) {
    const flags = [minifyOpts.css && 'CSS', minifyOpts.js && 'JS'].filter(Boolean).join(' + ');
    console.log(`[nocturnal] Minification enabled: ${flags}`);
  }

  // VALIDATE REQUIRED DIRS
  if (!fs.existsSync(pagesDir)) {
    throw new Error(
      `[nocturnal] Pages directory not found: ${pagesDir}\n` +
      `           Run "noc create" to scaffold your project.`
    );
  }
  if (!fs.existsSync(layoutsDir)) {
    throw new Error(
      `[nocturnal] Layouts directory not found: ${layoutsDir}\n` +
      `           Run "noc create" to scaffold your project.`
    );
  }

  // CLEAN + RECREATE DIST
  if (fs.existsSync(outputDir)) {

    // ** IMPORTANT **
    // Preserve .git/ if it exists 
    // (user may track dist/ changes separately)
    const gitDir = path.join(outputDir, '.git');
    const hasGit = fs.existsSync(gitDir);
    
    let gitBackup = null;

    if (hasGit) {
      gitBackup = path.join(root, '.git-dist-backup');
      fs.renameSync(gitDir, gitBackup);
    }

    fs.rmSync(outputDir, { recursive: true });
    fs.mkdirSync(outputDir, { recursive: true });

    if (hasGit && gitBackup) {
      fs.renameSync(gitBackup, gitDir);
    }
  } else {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // BUILD MERGED ISLANDS CODE FIRST (before rendering pages)
  // This needs to happen early so renderer can inline it
  const hydrateIslandsOn = config.hydrateIslands !== false;
  let mergedIslandsCode = '';
  
  if (hydrateIslandsOn) {
    // Read the islands.js runtime from the package lib/ directory
    const packageRoot = config.packageRoot || path.join(path.dirname(new URL(import.meta.url).pathname), '..');
    const islandsSrc = path.join(packageRoot, 'lib', 'islands.js');
    if (!fs.existsSync(islandsSrc)) {
      console.warn(`[nocturnal] ${yellow('islands.js not found')}, skipping island hydration`);
    } else {
      let islandsRuntime = fs.readFileSync(islandsSrc, 'utf8');
      
      // Strip the export keywords since we'll inline this
      islandsRuntime = islandsRuntime.replace(/export function /g, 'function ');
      
      // Extract island scripts from patterns
      const patternHtmlFiles = collectFiles(patternsDir, '.html');
      const islandEntries = [];
      for (const htmlFile of patternHtmlFiles) {
        const raw = fs.readFileSync(htmlFile, 'utf8');
        const { data: fm, content } = parseFrontmatter(raw);
        if (fm.hydrate !== true) continue;
        const scriptBody = extractIslandScript(content);
        if (!scriptBody) {
          console.warn(`[nocturnal] ${yellow('Pattern')} ${path.relative(patternsDir, htmlFile)} has hydrate: true but no <script data-island-extract>`);
          continue;
        }
        const baseName = path.basename(htmlFile, '.html');
        const islandName = fm.island || baseName;
        islandEntries.push({ name: islandName, body: scriptBody });
      }
      
      // Build the island map and store entries for per-page filtering (renderer injects only islands on each page)
      const entriesWithBody = islandEntries.map(({ name, body }) => {
        let minifiedBody = body;
        if (minifyOpts.js) {
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

      const islandMapCode = `\n/* Island map - auto-generated */\nconst islandMap = {\n${scriptMapLines.join(',\n')}\n};\n\n/* Auto-hydrate */\nif (Object.keys(islandMap).length > 0) {\n  hydrateIslands(islandMap);\n}\n`;

      // Merge runtime + map
      mergedIslandsCode = islandsRuntime + islandMapCode;
      
      // Optionally minify
      if (minifyOpts.js) {
        console.log('[nocturnal] Minifying islands code...');
        const tempFile = path.join(outputDir, '_islands-temp.js');
        const beforeSize = mergedIslandsCode.length;
        fs.writeFileSync(tempFile, mergedIslandsCode, 'utf8');
        minifyCopyFile(tempFile, tempFile, minifyOpts);
        mergedIslandsCode = fs.readFileSync(tempFile, 'utf8');
        
        // Final aggressive pass: collapse all newlines to single line for inline HTML
        mergedIslandsCode = mergedIslandsCode
          .replace(/\n+/g, ' ')           // All newlines → single space
          .replace(/\s{2,}/g, ' ')        // Multiple spaces → single space
          .trim();
        
        const afterSize = mergedIslandsCode.length;
        console.log(`[nocturnal] Islands minified: ${beforeSize} → ${afterSize} bytes (${Math.round((1 - afterSize/beforeSize) * 100)}% reduction)`);
        
        fs.rmSync(tempFile, { force: true });
      }
      
      console.log(`[nocturnal] ${green('✓')}  islands.js (merged runtime + map, will be inlined)`);
    }
  }
  
  // Store merged code globally so renderer can access it during page rendering
  global.__nocturnalMergedIslandsCode = mergedIslandsCode;

  // RENDER PAGES
  const pages   = collectFiles(pagesDir, '.html');
  const results = { built: [], skipped: [] };
  const allLazySections = new Map(); // Collect all lazy sections across pages

  for (const pageFile of pages) {
    if (isDynamicRoute(pageFile)) {
      console.warn(`[nocturnal] ${yellow('Skipping')} dynamic route (no data provider): ${path.relative(root, pageFile)}`);
      results.skipped.push(pageFile);
      continue;
    }

    try {
      const currentRoute = pageToRoute(pageFile, pagesDir);
      const result = await renderPage(pageFile, { 
        layoutsDir,
        patternsDir,
        baseURL: config.baseURL || '/',
        userConfig: config, // Pass the full config (already has assets from src/config.js)
        currentRoute,
        rootDir: root,
      });
      
      // Handle both old string return and new object return
      let html = typeof result === 'string' ? result : result.html;
      const lazySections = typeof result === 'object' ? result.lazySections : null;

      // Inject declarative shadow DOM for all builds.
      // context 'ssg' or 'ssr' lets components know which mode they're rendering in.
      const renderMode = config.ssr ? 'ssr' : 'ssg';
      html = await processSSRComponents(html, root, renderMode);
      // Inject render mode meta tag so client-side components can read it
      html = html.replace('<head>', `<head>\n  <meta name="nocturnal-render" content="${renderMode}">`);

      const outFile = pageToOutputPath(pageFile, pagesDir, outputDir);

      fs.mkdirSync(path.dirname(outFile), { recursive: true });
      fs.writeFileSync(outFile, html, 'utf8');

      console.log(`[nocturnal] ${green('✓')}  ${path.relative(root, pageFile)} → ${path.relative(root, outFile)}`);

      // Collect lazy sections for this page
      if (lazySections && lazySections.size > 0) {
        for (const [name, html] of lazySections) {
          allLazySections.set(name, html);
        }
      }

      results.built.push(outFile);

    } catch (err) {
      console.error(`[nocturnal] ${red('✗')}  Failed to render ${path.relative(root, pageFile)}: ${err.message}`);
    }
  }

  // COPY STATIC ASSETS
  // User components: src/components/ → dist/components/
  const userComponentsDir = path.join(root, 'src', 'components');
  if (fs.existsSync(userComponentsDir)) {
    minifyCopyDir(userComponentsDir, path.join(outputDir, 'components'), minifyOpts);
    console.log(`[nocturnal] ${green('✓')}  src/components/ → dist/components/`);
  }

  // User public assets: src/public/ → dist/public/
  const publicDir = path.join(root, 'src', 'public');
  if (fs.existsSync(publicDir)) {
    minifyCopyDir(publicDir, path.join(outputDir, 'public'), minifyOpts);
    console.log(`[nocturnal] ${green('✓')}  src/public/ → dist/public/`);
  }

  // nocturnal-components: node_modules/nocturnal-components/ → dist/nocturnal-components/
  const nocSrc = path.join(root, 'node_modules', 'nocturnal-components');
  if (fs.existsSync(nocSrc)) {
    minifyCopyDir(nocSrc, path.join(outputDir, 'nocturnal-components'), minifyOpts);
    console.log(`[nocturnal] ${green('✓')}  node_modules/nocturnal-components/ → dist/nocturnal-components/`);
  }

  // Lazy partials: derived ONLY from patterns (noc-reveal + noc-pattern src = source of truth).
  // Write to src/partials/ (never repo root), then copy to dist/partials/ for static serve.
  if (allLazySections.size > 0) {
    const srcPartialsDir = path.join(root, 'src', 'partials');
    const distPartialsDir = path.join(outputDir, 'partials');
    fs.mkdirSync(srcPartialsDir, { recursive: true });
    fs.mkdirSync(distPartialsDir, { recursive: true });

    for (const [name, html] of allLazySections) {
      const srcFile = path.join(srcPartialsDir, `${name}.html`);
      const distFile = path.join(distPartialsDir, `${name}.html`);
      fs.writeFileSync(srcFile, html, 'utf8');
      fs.writeFileSync(distFile, html, 'utf8');
      console.log(`[nocturnal] ${green('✓')}  src/partials/${name}.html (from pattern, copied to dist/partials/)`);
    }
  }

  console.log(
    `\n[nocturnal] ${green('Build complete')}. ${green(String(results.built.length))} page(s) built, ${results.skipped.length} skipped.\n`
  );

  return results;
}
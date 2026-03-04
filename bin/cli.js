#!/usr/bin/env node
/**
 * cli.js — Nocturnal CLI (runs from bin/)
 *
 * Commands:
 *   nocturnal create         Scaffold a new project in cwd (safe — won't overwrite)
 *   nocturnal build          SSG: pre-render all pages → dist/
 *   nocturnal watch          Dev mode: build then rebuild on file changes
 *   nocturnal serve          Serve dist/ on a local HTTP server
 *
 * Options:
 *   --root <path>            Run against a specific project root (default: cwd)
 *   --env <name>             Environment key from src/config.js (default: dev)
 *   --port <number>          Port for "serve" command (default: 3000)
 *   --help, -h               Show usage
 */

import path from 'path';
import fs from 'fs';
import { pathToFileURL } from 'url';
import { green, red, yellow } from '../lib/console-colors.js';


/*==========================================
ARGS
==========================================*/

const args = process.argv.slice(2);

// Extract command and profile (for "create" command)
// noc create → default profile
// noc create naked → naked profile
// noc create demo → demo profile
let command = args.find((a) => !a.startsWith('-')) || 'build';
let profile = 'demo'; // default profile

if (command === 'create') {
  const nextArg = args[args.indexOf('create') + 1];
  if (nextArg && !nextArg.startsWith('-')) {
    profile = nextArg;
  }
}

function getFlag(name) {
  const eq = args.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];
  if (eq) return eq;
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 ? args[idx + 1] : null;
}

const rootFlag = getFlag('root');
const envFlag  = getFlag('env') || 'dev';
const portFlag = parseInt(getFlag('port') || '3000', 10);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
  noc — SSG meta-framework for native Web Components

  Usage:
    noc create [profile]    Scaffold a new project (default: demo)
                            Profiles: demo, naked
    noc build               Pre-render all pages to dist/
    noc watch               Dev mode: build and watch for changes
    noc serve               Serve dist/ on a local HTTP server

  Options:
    --root <path>           Run against a specific project root (default: cwd)
    --env <dev|prod|stage>  Environment (reads baseURL from config, default: dev)
    --port <number>         Port for serve command (default: 3000)
    --help, -h              Show this help message

  Examples:
    noc create              Create project with demo profile
    noc create naked        Create minimal empty project
    noc build
    noc build --env prod
    noc watch
    noc serve --port 8080
`);
  process.exit(0);
}

/*==========================================
CONFIG
==========================================*/

async function loadConfig() {
  const root = rootFlag ? path.resolve(rootFlag) : process.cwd();

  // Resolve the package root (where nocturnal is installed / this repo lives)
  // bin/cli.js is one level below package root
  const binDir = path.dirname(new URL(import.meta.url).pathname);
  const binDirFixed = binDir.startsWith('/') && process.platform === 'win32'
    ? binDir.slice(1)
    : binDir;
  const packageRoot = path.resolve(path.join(binDirFixed, '..'));

  // Default config (used when src/config.js is missing; should match scaffolded config)
  let config = {
    root,
    packageRoot,
    outputDir: 'dist',
    baseURL: '/',
    ssr: false,
    hydrateIslands: true,
    minify: { css: true, js: true },
    compress: true,
    env: envFlag,
  };

  // Load user config from src/config.js (primary config location)
  const userConfigPath = path.join(root, 'src', 'config.js');
  if (fs.existsSync(userConfigPath)) {
    try {
      const mod = await import(pathToFileURL(userConfigPath).href);
      const userConfig = mod.default || {};
      
      // Merge user config
      config = { ...config, ...userConfig };
      
      // Handle environment-specific overrides
      if (userConfig.environments && userConfig.environments[envFlag]) {
        config = { ...config, ...userConfig.environments[envFlag] };
      }
      
      console.log(`[nocturnal] ${green('✓')}  Loaded config from src/config.js`);
    } catch (err) {
      console.warn(`[nocturnal] ${yellow('⚠')}  Failed to load src/config.js: ${err.message}`);
    }
  }

  return config;
}


/*==========================================
CREATE / SCAFFOLD
==========================================*/

async function scaffold(root, profileName) {
  const pagesDir = path.join(root, 'src', 'pages');

  if (fs.existsSync(pagesDir)) {
    console.log('[nocturnal] Project already exists (found src/pages/).');
    console.log('[nocturnal] Run "noc build" to build, or "noc watch" for dev mode.');
    return;
  }

  // Resolve profile from package root (bin/ is one level down from root)
  const binDir = path.dirname(new URL(import.meta.url).pathname);
  const binDirFixed = binDir.startsWith('/') && process.platform === 'win32'
    ? binDir.slice(1)
    : binDir;
  const packageRoot = path.join(binDirFixed, '..');
  const profilePath = path.join(packageRoot, 'profiles', `bootstrap-${profileName}.js`);

  if (!fs.existsSync(profilePath)) {
    console.error(`[nocturnal] ${red('✗')} Profile "${profileName}" not found.`);
    console.error(`[nocturnal] Looked in: ${profilePath}`);
    console.error('[nocturnal] Available profiles: demo, naked');
    process.exit(1);
  }

  console.log(`[nocturnal] Using profile: ${profileName}`);
  const mod = await import(pathToFileURL(profilePath).href);
  const { templates, directories } = mod;

  // Create directories
  for (const dir of directories) {
    fs.mkdirSync(path.join(root, dir), { recursive: true });
    console.log(`[nocturnal] ${green('created')}  ${dir}/`);
  }

  // Create files from templates
  for (const [file, content] of Object.entries(templates)) {
    const filePath = path.join(root, file);
    if (fs.existsSync(filePath)) {
      console.log(`[nocturnal] skipped  ${file} (already exists)`);
      continue;
    }
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`[nocturnal] ${green('created')}  ${file}`);
  }

  // Ensure root package.json has "type": "module" so src/config.js loads as ESM
  const pkgPath = path.join(root, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkgRaw = fs.readFileSync(pkgPath, 'utf8');
      const pkg = JSON.parse(pkgRaw);
      if (pkg.type !== 'module') {
        pkg.type = 'module';
        fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2), 'utf8');
        console.log(`[nocturnal] ${green('updated')}  package.json (added "type": "module")`);
      }
    } catch (err) {
      console.warn(`[nocturnal] ${yellow('⚠')}  Could not set "type": "module" in package.json: ${err.message}`);
    }
  }

  console.log(`\n[nocturnal] ${green('✓')} Done. Your Nocturnal site is ready.`);
  console.log('[nocturnal] Next steps:');
  console.log('[nocturnal]   noc build   - Build your site to dist/');
  console.log('[nocturnal]   noc serve   - Preview your site');
  console.log('[nocturnal]   noc watch   - Dev mode with auto-rebuild\n');
}


/*==========================================
RUN
==========================================*/

async function run() {
  const config = await loadConfig();

  // Dev server: config.devServer.port/host; CLI --port overrides port when provided
  const portFromCli = getFlag('port');
  const devPort = portFromCli != null ? parseInt(portFromCli, 10) : (config.devServer?.port ?? 3000);
  const devHost = config.devServer?.host ?? null;

  switch (command) {
    case 'create': {
      await scaffold(config.root, profile);
      break;
    }

    case 'build': {
      const { build } = await import('../lib/builder.js');
      await build(config);
      break;
    }

    case 'watch': {
      const { watch } = await import('../lib/watcher.js');
      watch(config, devPort, devHost);
      break;
    }

    case 'serve': {
      if (config.ssr) {
        const { serveSSR } = await import('../lib/ssr-server.js');
        serveSSR(config, devPort, devHost);
      } else {
        const { serve } = await import('../lib/server.js');
        serve(config, devPort, devHost);
      }
      break;
    }

    default:
      console.error(`[nocturnal] ${red('Unknown command')}: "${command}"`);
      console.error('Run "noc --help" for usage.');
      process.exit(1);
  }
}

run().catch((err) => {
  console.error(`[nocturnal] ${red('Fatal error')}:`, err.message);
  process.exit(1);
});

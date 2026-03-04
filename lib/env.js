/**
 * env.js — Load .env from project root into process.env (dev / small prod).
 * In production, the host sets env; we only set keys that are not already set
 * so host-injected values always win.
 */

import fs from 'fs';
import path from 'path';


/**
 * Parse a single .env line into [key, value] or null.
 * Supports KEY=value, KEY="value", KEY='value'. Skips comments and empty lines.
 *
 * @param {string} line
 * @returns {[string, string]|null}
 */
function parseEnvLine(line) {
  const trimmed = line.trim();

  if (trimmed === '' || trimmed.startsWith('#')) {
    return null;
  }

  const eq = trimmed.indexOf('=');

  if (eq <= 0) {
    return null;
  }

  const key = trimmed.slice(0, eq).trim();
  let value = trimmed.slice(eq + 1).trim();

  if (value.startsWith('"') && value.endsWith('"')) {
    value = value.slice(1, -1).replace(/\\"/g, '"');
  } else if (value.startsWith("'") && value.endsWith("'")) {
    value = value.slice(1, -1).replace(/\\'/g, "'");
  }

  return [key, value];
}


/**
 * Load .env from project root into process.env.
 * Only sets process.env[key] when it is not already set (host wins in prod).
 *
 * @param {string} root - Project root directory
 */
export function loadEnv(root) {
  const envPath = path.join(root, '.env');

  if (!fs.existsSync(envPath)) {
    return;
  }

  const content = fs.readFileSync(envPath, 'utf8');
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    const parsed = parseEnvLine(line);

    if (!parsed) {
      continue;
    }

    const [key, value] = parsed;

    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

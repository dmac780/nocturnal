/**
 * cookies.js — Parse Cookie header and format Set-Cookie for API responses.
 */

/**
 * Parse the Cookie request header into a plain object.
 * "a=1; b=2" → { a: "1", b: "2" }. Values are decoded with decodeURIComponent.
 *
 * @param {string} [cookieHeader] - req.headers.cookie
 * @returns {Record<string, string>}
 */
export function parseCookieHeader(cookieHeader) {
  const out = {};

  if (!cookieHeader || typeof cookieHeader !== 'string') {
    return out;
  }

  const pairs = cookieHeader.split(';').map((s) => s.trim());

  for (const pair of pairs) {
    const eq = pair.indexOf('=');
    if (eq === -1) {
      continue;
    }
    const name = pair.slice(0, eq).trim();
    let value = pair.slice(eq + 1).trim();
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1).replace(/\\"/g, '"');
    } else {
      try {
        value = decodeURIComponent(value);
      } catch (e) {
        // leave as-is if not valid URI component
      }
    }
    out[name] = value;
  }

  return out;
}


/**
 * Format a Set-Cookie header value string.
 *
 * @param {string} name - Cookie name
 * @param {string} value - Cookie value (will be encoded)
 * @param {{ path?: string, maxAge?: number, expires?: Date, httpOnly?: boolean, secure?: boolean, sameSite?: 'Strict'|'Lax'|'None' }} [options]
 * @returns {string}
 */
export function formatSetCookie(name, value, options = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`];

  if (options.path != null) {
    parts.push(`Path=${options.path}`);
  }

  if (options.maxAge != null) {
    parts.push(`Max-Age=${Number(options.maxAge)}`);
  }

  if (options.expires != null) {
    const d = options.expires instanceof Date ? options.expires : new Date(options.expires);
    parts.push(`Expires=${d.toUTCString()}`);
  }

  if (options.httpOnly === true) {
    parts.push('HttpOnly');
  }

  if (options.secure === true) {
    parts.push('Secure');
  }

  if (options.sameSite != null) {
    const s = options.sameSite;
    if (s === 'Strict' || s === 'Lax' || s === 'None') {
      parts.push(`SameSite=${s}`);
    }
  }

  return parts.join('; ');
}


/**
 * Format a Set-Cookie header that tells the browser to remove the cookie.
 * Use the same path (and domain if you set it) as when you set the cookie.
 *
 * @param {string} name - Cookie name
 * @param {{ path?: string }} [options] - path should match the cookie when it was set (default '/')
 * @returns {string}
 */
export function formatClearCookie(name, options = {}) {
  const path = options.path ?? '/';
  return `${name}=; Path=${path}; Max-Age=0`;
}

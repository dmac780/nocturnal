/**
 * cors.js — CORS header helpers for API routes.
 * Used when config.apiCors is set so /api/* can be called from other origins (SPAs, mobile apps).
 */

const DEFAULT_METHODS = 'GET, POST, PUT, PATCH, DELETE, OPTIONS';
const DEFAULT_ALLOW_HEADERS = 'Content-Type, Authorization';

/**
 * Build CORS headers for a response. No-op when options is falsy (same-origin only).
 *
 * @param {import('http').IncomingMessage} req - Request (used to reflect Origin when origin option is true)
 * @param {boolean|object} [options] - true = permissive (*). Object: { origin, methods, allowHeaders, credentials }
 * @returns {Record<string, string>} - Headers to merge into the response
 */
export function getCorsHeaders(req, options) {
  if (options == null || options === false) {
    return {};
  }

  const origin = req.headers.origin;

  if (options === true) {
    return {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': DEFAULT_METHODS,
      'Access-Control-Allow-Headers': DEFAULT_ALLOW_HEADERS,
      'Access-Control-Max-Age': '86400',
    };
  }

  const allowOrigin = options.origin === true && origin
    ? origin
    : (options.origin ?? '*');
  const headers = {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': options.methods ?? DEFAULT_METHODS,
    'Access-Control-Allow-Headers': options.allowHeaders ?? DEFAULT_ALLOW_HEADERS,
    'Access-Control-Max-Age': options.maxAge ?? '86400',
  };

  if (options.credentials === true) {
    headers['Access-Control-Allow-Credentials'] = 'true';
  }

  return headers;
}

/**
 * ssr-api.js — API route layer for the SSR server
 * Resolves /api/* to src/api/*.js (static and dynamic [param] segments),
 * builds request context (body, query, headers, params), and provides response helpers.
 */

import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { getCorsHeaders } from './cors.js';
import { parseCookieHeader, formatSetCookie, formatClearCookie } from './cookies.js';

/** Segment is a path param when it matches [name] (brackets, no nested brackets). */
const PARAM_SEGMENT_REGEX = /^\[([^[\]]+)\]$/;


/**
 * Response descriptor helpers for API handlers.
 * Return a { status, headers, body } shape that handleAPIRoute sends to the client.
 *
 * @param {*} data - Value to send as JSON
 * @param {number} [status=200] - HTTP status code
 * @returns {{ status: number, headers: Record<string, string>, body: string }}
 */
export function json(data, status = 200) {
  return {
    status,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  };
}


/**
 * @param {string} url - Location URL
 * @param {number} [status=302] - Redirect status (e.g. 302, 307)
 * @returns {{ status: number, headers: Record<string, string>, body: string }}
 */
export function redirect(url, status = 302) {
  return {
    status,
    headers: { Location: url },
    body: '',
  };
}


/**
 * @param {string} message - Error message
 * @param {number} [status=500] - HTTP status
 * @returns {{ status: number, headers: Record<string, string>, body: string }}
 */
export function error(message, status = 500) {
  return {
    status,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ error: message }),
  };
}


/**
 * Send a string body with optional Content-Type and status. Use for HTML, plain text, etc.
 *
 * @param {string} body - Response body
 * @param {string} [contentType='text/plain'] - Content-Type header value
 * @param {number} [status=200] - HTTP status code
 * @returns {{ status: number, headers: Record<string, string>, body: string }}
 */
export function send(body, contentType = 'text/plain', status = 200) {
  return {
    status,
    headers: { 'Content-Type': contentType },
    body: typeof body === 'string' ? body : String(body),
  };
}


/**
 * Build a list of API routes by scanning src/api. Each route has segments (path parts),
 * param names extracted from [param] segments, and the file path. Static routes sorted before dynamic.
 *
 * @param {string} root - Project root
 * @returns {{ segments: string[], paramNames: string[], filePath: string }[]}
 */
export function buildApiRoutes(root) {
  const apiDir = path.join(root, 'src', 'api');
  const routes = [];

  if (!fs.existsSync(apiDir)) {
    return routes;
  }

  /**
   * @param {string} dir
   * @param {string[]} prefix - Relative path segments so far (e.g. ['users'])
   */
  function walk(dir, prefix = []) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const e of entries) {
      const rel = [...prefix, e.name];
      const full = path.join(dir, e.name);

      if (e.isDirectory()) {
        walk(full, rel);
      } else if (e.isFile() && e.name.toLowerCase().endsWith('.js')) {
        const segmentPath = rel.slice(0, -1);
        const baseName = rel[rel.length - 1].replace(/\.js$/i, '');
        const segments = [...segmentPath, baseName];
        const paramNames = segments
          .map((s) => {
            const m = s.match(PARAM_SEGMENT_REGEX);
            return m ? m[1] : null;
          })
          .filter(Boolean);
        routes.push({ segments, paramNames, filePath: full });
      }
    }
  }

  walk(apiDir);

  routes.sort((a, b) => {
    if (a.segments.length !== b.segments.length) {
      return a.segments.length - b.segments.length;
    }
    return a.paramNames.length - b.paramNames.length;
  });

  return routes;
}


/**
 * Find a route that matches the given path segments. Prefers static (no params) over dynamic.
 *
 * @param {{ segments: string[], paramNames: string[], filePath: string }[]} routes
 * @param {string[]} pathSegments - e.g. ['users', '42']
 * @returns {{ route: { segments: string[], paramNames: string[], filePath: string }, params: Record<string, string> } | null}
 */
export function matchRoute(routes, pathSegments) {
  for (const route of routes) {
    if (route.segments.length !== pathSegments.length) {
      continue;
    }

    const params = {};
    let matched = true;

    for (let i = 0; i < pathSegments.length; i++) {
      const seg = route.segments[i];
      const reqSeg = pathSegments[i];
      const paramMatch = seg.match(PARAM_SEGMENT_REGEX);

      if (paramMatch) {
        params[paramMatch[1]] = reqSeg;
      } else if (seg !== reqSeg) {
        matched = false;
        break;
      }
    }

    if (matched) {
      return { route, params };
    }
  }

  return null;
}


/**
 * Parse request body for POST/PUT/PATCH. Reads stream once; parses JSON when Content-Type is application/json.
 *
 * @param {import('http').IncomingMessage} req
 * @param {string} method
 * @returns {Promise<*|string|null>} - Parsed object, raw string, or null
 */
async function readRequestBody(req, method) {
  if (!['POST', 'PUT', 'PATCH'].includes(method)) {
    return null;
  }

  let raw = '';

  for await (const chunk of req) {
    raw += chunk.toString();
  }

  const ct = (req.headers['content-type'] || '').toLowerCase();

  if (ct.includes('application/json') && raw.trim()) {
    try {
      return JSON.parse(raw);
    } catch (e) {
      return raw;
    }
  }

  return raw || null;
}


/**
 * Resolve and call an API route handler.
 * Looks for src/api/*.js files; /api/foo → src/api/foo.js. Feeds pages and patterns alike.
 * Handlers receive { request, body, query, headers, params, cookies, setCookie, clearCookie, json, redirect, error, send } and may return
 * a response descriptor (from the helpers) or a plain value (sent as 200 JSON).
 *
 * @param {string} root - Project root
 * @param {string} urlPath - Request URL path (e.g. /api/upvote or /api/upvote?x=1)
 * @param {import('http').IncomingMessage} req - Node HTTP request
 * @param {import('http').ServerResponse} res - Node HTTP response
 * @param {{ cors?: boolean|object }} [options] - Optional. cors: true or { origin, methods, allowHeaders } for CORS headers
 * @returns {Promise<boolean>} - true if API route was found and handled
 */
export async function handleAPIRoute(root, urlPath, req, res, options = {}) {
  const apiPrefix = '/api/';

  if (!urlPath.startsWith(apiPrefix)) {
    return false;
  }

  const pathWithoutQuery = urlPath.slice(apiPrefix.length).split('?')[0].replace(/\/$/, '') || '';
  const pathSegments = pathWithoutQuery ? pathWithoutQuery.split('/').filter(Boolean) : [];

  const routes = buildApiRoutes(root);
  const match = matchRoute(routes, pathSegments);

  if (!match) {
    return false;
  }

  const corsHeaders = getCorsHeaders(req, options.cors);
  const mergeHeaders = (h) => ({ ...corsHeaders, ...h });

  const { route, params } = match;
  const apiFile = route.filePath;

  try {
    const apiUrl = pathToFileURL(apiFile).href;
    const mod = await import(apiUrl);
    const method = req.method.toUpperCase();
    const handler = mod[method] || mod.default;

    if (typeof handler !== 'function') {
      res.writeHead(405, mergeHeaders({ 'Content-Type': 'application/json' }));
      res.end(JSON.stringify({ error: 'Method not allowed' }));
      return true;
    }

    const qs = urlPath.includes('?') ? urlPath.split('?')[1] : '';
    const query = Object.fromEntries(new URLSearchParams(qs).entries());
    const body = await readRequestBody(req, method);
    const headers = { ...req.headers };
    const cookies = parseCookieHeader(req.headers.cookie);
    const cookiesToSet = [];

    const setCookie = (name, value, options = {}) => {
      cookiesToSet.push(formatSetCookie(name, value, options));
    };

    const clearCookie = (name, options = {}) => {
      cookiesToSet.push(formatClearCookie(name, options));
    };

    const context = {
      request: req,
      body,
      query,
      headers,
      params,
      cookies,
      setCookie,
      clearCookie,
      json,
      redirect,
      error,
      send,
    };

    const response = await handler(context);

    const mergeCookiesInto = (h) => {
      if (cookiesToSet.length === 0) {
        return h;
      }
      return { ...h, 'Set-Cookie': cookiesToSet.length === 1 ? cookiesToSet[0] : cookiesToSet };
    };

    if (response && typeof response.status === 'number') {
      const outHeaders = mergeCookiesInto(response.headers || {});
      res.writeHead(response.status, mergeHeaders(outHeaders));
      res.end(response.body ?? '');
    } else {
      const outHeaders = mergeCookiesInto({ 'Content-Type': 'application/json' });
      res.writeHead(200, mergeHeaders(outHeaders));
      res.end(JSON.stringify(response ?? {}));
    }

    return true;

  } catch (err) {
    console.error(`[nocturnal/api] Error in ${apiFile}: ${err.message}`);
    res.writeHead(500, mergeHeaders({ 'Content-Type': 'application/json' }));
    res.end(JSON.stringify({ error: 'Internal server error' }));
    return true;
  }
}

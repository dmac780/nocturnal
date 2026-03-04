# API Routes

Nocturnal’s API layer runs only when **SSR is enabled** (`config.ssr: true`). Requests to `/api/*` are resolved to files in `src/api/` and executed on the server. Handlers receive a shared **context** (body, query, headers, params, cookies, etc.) and can return JSON, redirects, or errors via **response helpers**, or any custom **response descriptor**. Routes can be **static** or **dynamic** (path parameters via `[param]`).

**Copy-paste examples:** [README_API_EXAMPLES.md](README_API_EXAMPLES.md) — GET, POST, path params, cookies, form endpoint, redirect, error, send.  
**Cookies (read/set/clear):** [README_COOKIES.md](README_COOKIES.md).

---

## Adding a route

1. Create a file under `src/api/` whose path matches the URL after `/api/` (see static and path params below).
2. Export a function per HTTP method: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, or `default`.

**Static: URL → file mapping** (create any file under `src/api/`; the path after `/api/` matches)

| URL            | File you create     |
|----------------|---------------------|
| `/api/greeting`   | `src/api/greeting.js`  |
| `/api/users`   | `src/api/users.js`  |
| `/api/feed/items` | `src/api/feed/items.js` |

**Dynamic: path parameters**

Use **brackets** in file or folder names: `[paramName]`. One handler serves many IDs or slugs. The matched segment is available as `context.params.paramName`.

| URL | File | `context.params` |
|-----|------|------------------|
| `/api/users/42` | `src/api/users/[id].js` | `{ id: '42' }` |
| `/api/orgs/acme/repos/widget` | `src/api/orgs/[org]/repos/[repo].js` | `{ org: 'acme', repo: 'widget' }` |

Static routes win over dynamic when the path matches exactly (e.g. `src/api/users.js` handles `/api/users`, while `src/api/users/[id].js` handles `/api/users/123`).

See [README_API_EXAMPLES.md](README_API_EXAMPLES.md) for full snippets (static GET/POST, dynamic `users/[id]`, cookies, form, redirect, error, send).

---

## Context

Every handler receives a single argument: a **context** object with the following properties.

| Property   | Type     | Description |
|-----------|----------|-------------|
| `request` | IncomingMessage | Raw Node.js request (stream, etc.). |
| `body`    | any \| null | Parsed request body. For `POST`/`PUT`/`PATCH` with `Content-Type: application/json`, this is the parsed object; otherwise the raw string, or `null` if no body. |
| `query`   | object  | Query string as a plain object (e.g. `?a=1&b=2` → `{ a: '1', b: '2' }`). |
| `headers` | object  | Copy of `request.headers`. |
| `params`  | object  | Path parameters from dynamic segments (e.g. `[id]` → `params.id`). Empty `{}` for static routes. |
| `cookies` | object  | Parsed `Cookie` header: `{ name: value, ... }`. Empty `{}` if no cookie header. |
| `setCookie` | function | Queue a cookie for the response: `setCookie(name, value, options?)`. Options: `path`, `maxAge`, `expires`, `httpOnly`, `secure`, `sameSite` ('Strict' \| 'Lax' \| 'None'). |
| `clearCookie` | function | Remove a cookie: `clearCookie(name, options?)`. Use same `path` as when you set it (default `'/'`). |
| `json`    | function | Helper: `json(data, status?)` → response descriptor. |
| `redirect`| function | Helper: `redirect(url, status?)` → response descriptor. |
| `error`   | function | Helper: `error(message, status?)` → response descriptor. |
| `send`    | function | Helper: `send(body, contentType?, status?)` → response descriptor (e.g. HTML or plain text). |

**Cookies** — Read `context.cookies`, set with `context.setCookie(name, value, options?)`, clear with `context.clearCookie(name, options?)`. Full usage and testing: [README_COOKIES.md](README_COOKIES.md).

---

## Response descriptor

The server sends a response based on what the handler **returns**.

- If the return value has a **`status`** property (number), it is treated as a **response descriptor**: the server calls `res.writeHead(status, headers)` and `res.end(body)`. You can return such an object from the helpers or build it yourself.
- Otherwise the return value is sent as **200 JSON** (e.g. returning a plain object is valid).

**Descriptor shape**

| Property  | Type   | Required | Description |
|----------|--------|----------|-------------|
| `status` | number | yes      | HTTP status code (e.g. 200, 201, 400, 404, 500). |
| `headers`| object | no       | Response headers (e.g. `{ 'Content-Type': 'application/json' }`). Defaults to `{}` if omitted. |
| `body`   | string | no       | Response body. Defaults to `''` if omitted. |

Returning a custom descriptor is supported for any content type or status:

```js
export function GET({ request, json }) {
  // Custom descriptor
  return {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'X-Custom': 'yes' },
    body: JSON.stringify({ ok: true }),
  };
}
```

---

## Response helpers

Helpers return a response descriptor so the server can send the response. They are **unopinionated** about status codes: use the status that fits (e.g. 201 for create, 204 for no content, 4xx/5xx for errors).

### `json(data, status?)`

- **data** — Value to send as JSON (will be `JSON.stringify`’d).
- **status** — Optional. Defaults to `200`.
- **Content-Type** is set to `application/json`.

Use for success payloads (200, 201, etc.) or JSON error bodies when you want a custom status:

```js
return json({ id: 1, name: 'Foo' });
return json({ id: 1, name: 'Foo' }, 201);
```

### `redirect(url, status?)`

- **url** — Value for the `Location` header.
- **status** — Optional. Defaults to `302` (temporary redirect). Use `307` for temporary “keep method”, or `301`/`308` for permanent.

```js
return redirect('/login');
return redirect('/new-url', 301);
```

### `error(message, status?)`

- **message** — Error message; sent as `{ error: message }` in the body.
- **status** — Optional. Defaults to `500`.
- **Content-Type** is set to `application/json`.

Use for validation or server errors:

```js
return error('Invalid input', 400);
return error('Not found', 404);
return error('Server error');  // 500
```

### `send(body, contentType?, status?)`

- **body** — Response body (string).
- **contentType** — Optional. Defaults to `'text/plain'`.
- **status** — Optional. Defaults to `200`.

Use for non-JSON responses (HTML, plain text, etc.) without building a descriptor by hand:

```js
return send('OK');
return send('<p>Hello</p>', 'text/html');
return send('Created', 'text/plain', 201);
```

---

## Status codes (summary)

| Helper    | Default status | Typical use |
|----------|----------------|-------------|
| `json`   | 200            | 200 OK, 201 Created, etc. |
| `redirect` | 302          | 302/307 temporary, 301/308 permanent |
| `error`  | 500            | 400 Bad Request, 401 Unauthorized, 404 Not Found, 500 Internal Server Error |
| `send`   | 200            | Any status with text or HTML body |

You can return any `{ status, headers?, body }` descriptor for full control (custom headers, other content types, or status codes not covered by the helpers).

---

## CORS

When your API is called from another origin (e.g. a SPA on a different port or domain), the browser enforces CORS. By default the API does **not** send CORS headers (same-origin only). To allow cross-origin requests, set **`apiCors`** in your config (SSR only):

```js
// src/config.js
export default {
  ssr: true,
  apiCors: true,   // Permissive: Access-Control-Allow-Origin: *
  // ...
};
```

**`apiCors: true`** — Sends `Access-Control-Allow-Origin: *`, allows common methods and `Content-Type`, `Authorization` headers. OPTIONS preflight for `/api/*` returns 204 with CORS headers.

**`apiCors: { ... }`** — Fine-grained:

| Option        | Default | Description |
|---------------|---------|-------------|
| `origin`      | `'*'`   | `'*'` or a specific origin. Use `true` to reflect the request `Origin` (for credentials). |
| `methods`     | `'GET, POST, PUT, PATCH, DELETE, OPTIONS'` | Allowed methods. |
| `allowHeaders`| `'Content-Type, Authorization'` | Allowed request headers. |
| `credentials` | `false` | Set `true` when using cookies/auth and reflecting `origin`. |
| `maxAge`      | `'86400'` | Preflight cache (seconds). |

Example with credentials (reflect origin):

```js
apiCors: { origin: true, credentials: true },
```

---

## When API routes run

- **SSR on** (`noc serve` with `config.ssr: true`): `/api/*` is handled by the Node server; handlers run on each request.
- **SSG / static** (e.g. `noc build` then static host): There is no server; `/api/*` will 404 unless you deploy an adapter or separate API. Use API routes only in SSR mode or behind a compatible server.

---

## Testing the implementation

**1. Route matching (no server)**  
From the project root, run:

```bash
npm run test:api
```

This runs `test/api-routes.js`, which exercises `buildApiRoutes` and `matchRoute` against whatever routes exist under `src/api/` (e.g. static and dynamic path params) and that invalid paths return no match.

**2. Live endpoints (browser)**  
Run `noc serve`, then call your API from the browser (e.g. fetch from devtools, or a pattern that uses `fetch('/api/...')`). See [README_API_EXAMPLES.md](README_API_EXAMPLES.md) for route examples.

**3. Manual (curl)**  
With the server running, call your route (replace `your-route` with the path that matches your file, e.g. `greeting` for `src/api/greeting.js`):

```bash
curl -s http://localhost:3000/api/your-route
curl -s -X POST -H "Content-Type: application/json" -d "{\"name\":\"hi\"}" http://localhost:3000/api/your-route
```

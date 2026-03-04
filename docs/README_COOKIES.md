# Cookies (API)

API handlers get parsed cookies in **`context.cookies`** and can set or clear cookies with **`context.setCookie`** and **`context.clearCookie`**. The server reads the `Cookie` header and writes `Set-Cookie` headers on the response.

---

## Context

| Property       | Description |
|----------------|-------------|
| `context.cookies` | Parsed `Cookie` header: `{ name: value, ... }`. Empty `{}` if none. |
| `context.setCookie(name, value, options?)` | Queue a `Set-Cookie` for the response. Options: `path`, `maxAge`, `expires`, `httpOnly`, `secure`, `sameSite`. |
| `context.clearCookie(name, options?)` | Remove a cookie. Use same `path` as when set (default `'/'`). |

---

## Options (setCookie)

| Option     | Example | Description |
|------------|---------|-------------|
| `path`     | `'/'`   | Path the cookie is sent for. |
| `maxAge`   | `86400` | Lifetime in seconds. |
| `expires`  | `new Date(...)` | Expiry date. |
| `httpOnly` | `true`  | Not readable by JS (recommended for session). |
| `secure`   | `true`  | HTTPS only (use in production). |
| `sameSite` | `'Lax'` | `'Strict'`, `'Lax'`, or `'None'`. |

---

## Snippets

**Read cookies**

```js
export function GET({ cookies, json }) {
  const theme = cookies.theme ?? 'light';
  return json({ theme });
}
```

**Set a cookie**

```js
export function POST({ setCookie, json }) {
  setCookie('pref', 'dark', { path: '/', maxAge: 31536000, sameSite: 'Lax' });
  return json({ ok: true });
}
```

**Session-style (set if missing)**

```js
export function POST({ cookies, setCookie, json }) {
  const sessionId = cookies.sessionId;
  if (!sessionId) {
    setCookie('sessionId', 'abc-123', { path: '/', httpOnly: true, maxAge: 86400, sameSite: 'Lax' });
  }
  return json({ ok: true });
}
```

**Clear a cookie (e.g. logout)**

```js
export function POST({ clearCookie, json }) {
  clearCookie('sessionId', { path: '/' });
  return json({ ok: true });
}
```

**Set and clear in one handler (demo)**

```js
export function GET({ cookies, query, setCookie, clearCookie, json }) {
  if (query.set === '1') {
    setCookie('demo', 'value', { path: '/', maxAge: 60, sameSite: 'Lax' });
  }
  if (query.clear === '1') {
    clearCookie('demo', { path: '/' });
  }
  return json({ cookies });
}
```

---

## How it works

1. **Incoming** — The server parses `req.headers.cookie` (e.g. `sessionId=abc; theme=dark`) into `context.cookies` (`{ sessionId: 'abc', theme: 'dark' }`).
2. **Outgoing** — Your handler calls `setCookie` or `clearCookie` before returning. The API layer adds the corresponding `Set-Cookie` header(s) to the response. The browser stores them and sends them back on the next request.

---

## How to test

**Browser:** With SSR on (`noc serve`), open an API route that reads `context.cookies` and returns JSON. Call it with `?set=1` to set a cookie, then call again with no query to see the cookie in the response. Use `?clear=1` to clear.

**curl:** Save cookies from a response, then send them on the next request:

```bash
curl -s -c cookies.txt "http://localhost:3000/api/your-route?set=1"
curl -s -b cookies.txt http://localhost:3000/api/your-route
```

Clear by calling your route with whatever clear param your handler uses (e.g. `?clear=1`), or delete `cookies.txt`.

# API examples (snippets)

Create files under **`src/api/`**; the path after `/api/` maps to the file (e.g. `src/api/items.js` → `GET/POST /api/items`). These snippets show what to put in your handlers. See [README_API.md](README_API.md) for reference and [README_COOKIES.md](README_COOKIES.md) for cookies.

---

## Static route: GET

Create e.g. **`src/api/greeting.js`**. URL becomes `/api/greeting`.

```js
export function GET({ query, json }) {
  const name = query.name ?? 'world';
  return json({ message: `Hello, ${name}`, timestamp: new Date().toISOString() });
}
```

- Request: `GET /api/greeting`, `GET /api/greeting?name=World`

---

## Static route: POST (JSON body)

In the same file add a **POST** export, or create a separate file (e.g. `src/api/items.js` for `/api/items`).

```js
export function POST({ body, json, error }) {
  if (body == null) {
    return json({ received: {}, echo: 'No body' });
  }
  if (typeof body === 'string') {
    return error('Invalid JSON', 400);
  }
  if (!body.name) {
    return error('Missing name', 400);
  }
  return json({ created: body.name }, 201);
}
```

- Request: `POST /api/your-route` with `Content-Type: application/json` and body `{ "name": "Foo" }`.

---

## Dynamic route: path parameter

Create **`src/api/users/[id].js`** (literal bracket folder/file names). One handler serves e.g. `/api/users/42`, `/api/users/99`; the segment is in `context.params.id`.

```js
export function GET({ params, json, error }) {
  if (!params.id) {
    return error('Missing id', 400);
  }
  // e.g. load user from DB
  const user = { id: params.id, name: `User ${params.id}` };
  return json(user);
}
```

- Request: `GET /api/users/42` → `context.params.id === '42'`.

**Nested:** `src/api/orgs/[org]/repos/[repo].js` → `context.params` has `org` and `repo`.

---

## Query string

Use **`context.query`** (already parsed from the URL).

```js
export function GET({ query, json }) {
  const { page = '1', limit = '10' } = query;
  return json({ page, limit });
}
```

- Request: `GET /api/items?page=2&limit=20` (for a file like `src/api/items.js`).

---

## Redirect

```js
export function GET({ redirect }) {
  return redirect('/login', 302);
}
```

- Use `301` or `308` for permanent redirects.

---

## Error responses

```js
export function GET({ error }) {
  return error('Not found', 404);
}

export function POST({ body, error, json }) {
  if (!body?.email) return error('Missing email', 400);
  return json({ ok: true });
}
```

---

## Non-JSON response (send)

```js
export function GET({ send }) {
  return send('<p>Hello</p>', 'text/html');
}

export function GET({ send }) {
  return send('Created', 'text/plain', 201);
}
```

---

## Custom response descriptor

Full control over status, headers, and body:

```js
export function GET({ json }) {
  return {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'X-Custom': 'yes' },
    body: JSON.stringify({ ok: true }),
  };
}
```

---

## Cookies (read / set / clear)

**Read:** `context.cookies.theme`  
**Set:** `context.setCookie('theme', 'dark', { path: '/', maxAge: 86400 })`  
**Clear:** `context.clearCookie('theme', { path: '/' })`

Full examples: [README_COOKIES.md](README_COOKIES.md).

---

## Form submission endpoint

Create e.g. **`src/api/form-example.js`** so the URL is `POST /api/form-example`. You can accept JSON (from `fetch`) or classic form encoding.

**Option A: Client sends JSON** (e.g. `fetch('/api/form-example', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, email }) }`)

```js
export function POST({ body, json, error }) {
  if (!body?.name || !body?.email) {
    return error('Missing name or email', 400);
  }
  // e.g. save to DB
  return json({ id: 1, ...body }, 201);
}
```

**Option B: Form sends urlencoded** — body will be a string. Parse it:

```js
export function POST({ body, json, error }) {
  if (typeof body !== 'string') {
    return error('Expected form body', 400);
  }
  const params = new URLSearchParams(body);
  const name = params.get('name');
  const email = params.get('email');
  if (!name || !email) return error('Missing name or email', 400);
  return json({ id: 1, name, email }, 201);
}
```

In your pattern or page, point the form at your route: `action="/api/form-example"` and `method="post"`, or submit via `fetch` with JSON.

---

## Minimal GET + POST in one file

One file can export both **GET** and **POST**. Create e.g. `src/api/health.js` for `/api/health`:

```js
export function GET({ json }) {
  return json({ message: 'OK', timestamp: new Date().toISOString() });
}

export function POST({ body, json }) {
  return json({ received: body ?? {} });
}
```

Use any filename; the URL path matches (e.g. `src/api/feedback.js` → `/api/feedback`).

# Mock Server

HarborClient plugin that runs a local WireMock-style HTTP mock server inside the app.

## Features

- Footer panel **Mock server** with port, start/stop, status, and an **Open Mock Server** button
- Full-page **Mock Server** tab for the stub list and Match/Respond/Scripts editor
- Match incoming requests by HTTP method and path (exact or trailing `*` prefix)
- Respond with custom status codes, headers, JSON or text bodies, and optional delay
- Per-stub **Before** and **After** scripts (same `hc` sandbox as Echo / collection scripts)
- Sets the global variable `mockBaseUrl` (for example `http://localhost:4335`) when the server starts
- Status indicator on the footer toggle showing whether the server is listening

## Permissions

- `ui` — footer panel, full-page main view, and status indicator
- `ipc` — renderer ↔ main coordination for start/stop/status/stubs
- `server` — local loopback HTTP server in the Electron main process
- `storage` — persist stubs and share running status across plugin webviews

## Development

```bash
pnpm install
pnpm build
```

Load the unpacked plugin directory from HarborClient **Settings → Plugins → Load unpacked**.

Requires HarborClient **>= 2.5.4** with structured `hc.server.onRequest` responses (`kind: 'http-response'`).

## Stubs

Each stub has:

| Field         | Description                                                           |
| ------------- | --------------------------------------------------------------------- |
| Method        | `GET`, `POST`, …, or `*` for any method                               |
| Path          | Exact path, or a trailing `*` for prefix match (for example `/api/*`) |
| Status        | HTTP status code (default `200`)                                      |
| Headers       | Optional response headers                                             |
| Body          | JSON object/array text, or plain text                                 |
| Delay         | Milliseconds to wait before responding                                |
| Before script | Runs after this stub matches, before the canned response is used      |
| After script  | Runs just before the response is returned to the host                 |

Enabled stubs are evaluated in list order (top first). The first match wins. Unmatched requests return `404` with a JSON error body (no scripts run).

### Script lifecycle

For a matched stub:

1. **Before** (`phase: 'pre'`) — `hc.request` is the inbound request. Mutable request APIs and `console` / `hc.test` are available. There is no `hc.response` yet.
2. Build the planned response from the stub’s status, headers, body, and delay (unless Before already overrode it).
3. **After** (`phase: 'post'`) — `hc.response` is the planned response (read-only). Use it for inspection or tests.
4. Return the final response to the host (delay still applied by HarborClient).

### Script return values

Empty scripts and comment-only scripts are skipped. Script errors are logged and the planned response is kept.

A non-null return value overrides the planned response:

- `{ kind: 'http-response', status?, headers?, body?, delayMs? }` replaces the whole response (`delayMs` falls back to the planned delay when omitted).
- Any other value replaces only `body`, keeping status, headers, and delay.

Example Before override:

```javascript
return { ok: "from before", path: hc.request.url };
```

Example After override:

```javascript
const data = hc.response.json();
data.via = "after";
return data;
```

## Sign and verify

```bash
pnpm sign -- --dir . --private-key /path/to/signing.pem --key-id harborclient-official
pnpm verify -- --dir . --public-key /path/to/harborclient.key
```

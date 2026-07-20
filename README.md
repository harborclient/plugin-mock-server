# Mock Server

HarborClient plugin that runs a local WireMock-style HTTP mock server inside the app.

## Features

- Footer panel **Mock server** with port configuration, start/stop controls, and a stub registry
- Match incoming requests by HTTP method and path (exact or trailing `*` prefix)
- Respond with custom status codes, headers, JSON or text bodies, and optional delay
- Sets the global variable `mockBaseUrl` (for example `http://localhost:4335`) when the server starts
- Status indicator on the footer toggle showing whether the server is listening

## Permissions

- `ui` — footer panel and status indicator
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

| Field   | Description                                                           |
| ------- | --------------------------------------------------------------------- |
| Method  | `GET`, `POST`, …, or `*` for any method                               |
| Path    | Exact path, or a trailing `*` for prefix match (for example `/api/*`) |
| Status  | HTTP status code (default `200`)                                      |
| Headers | Optional response headers                                             |
| Body    | JSON object/array text, or plain text                                 |
| Delay   | Milliseconds to wait before responding                                |

Enabled stubs are evaluated in list order (top first). The first match wins. Unmatched requests return `404` with a JSON error body.

## Sign and verify

```bash
pnpm sign -- --dir . --private-key /path/to/signing.pem --key-id harborclient-official
pnpm verify -- --dir . --public-key /path/to/harborclient.key
```

/**
 * Enabled key/value header row on a mock stub.
 */
export interface MockStubHeader {
  key: string;
  value: string;
  enabled: boolean;
}

/**
 * One mock stub: match rule plus canned HTTP response.
 */
export interface MockStub {
  id: string;
  enabled: boolean;
  /**
   * Lower values win; list order maps to priority (0 = first).
   */
  priority: number;
  /**
   * HTTP method, or `*` for any method.
   */
  method: string;
  /**
   * Exact path, or trailing `*` for prefix match.
   */
  path: string;
  status: number;
  headers: MockStubHeader[];
  /**
   * Response body text. Parsed as JSON when it looks like JSON.
   */
  body: string;
  delayMs: number;
}

/**
 * Running state shared between the footer panel and indicator.
 */
export interface MockServerUiStatus {
  running: boolean;
  port?: number;
  hitCount: number;
  stubCount: number;
}

/**
 * Structured HTTP response returned to the HarborClient plugin server host.
 */
export interface PluginServerHttpResponse {
  kind: "http-response";
  status?: number;
  headers?: Record<string, string>;
  body?: unknown;
  delayMs?: number;
}

/**
 * Creates a new stub with sensible defaults.
 *
 * @param overrides - Optional field overrides.
 * @returns A new stub ready to edit.
 */
export function createDefaultStub(overrides: Partial<MockStub> = {}): MockStub {
  const id =
    overrides.id ??
    (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `stub-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`);

  const { id: _ignoredId, ...rest } = overrides;

  return {
    enabled: true,
    priority: 0,
    method: "GET",
    path: "/example",
    status: 200,
    headers: [
      { key: "Content-Type", value: "application/json", enabled: true },
    ],
    body: '{\n  "ok": true\n}\n',
    delayMs: 0,
    ...rest,
    id,
  };
}

/**
 * Stub templates shown in the empty-state quick-add actions.
 */
export const STUB_TEMPLATES: Array<{ label: string; stub: Partial<MockStub> }> =
  [
    {
      label: "JSON 200",
      stub: {
        method: "GET",
        path: "/ok",
        status: 200,
        body: '{\n  "ok": true\n}\n',
        headers: [
          { key: "Content-Type", value: "application/json", enabled: true },
        ],
      },
    },
    {
      label: "404 Not Found",
      stub: {
        method: "*",
        path: "/missing",
        status: 404,
        body: '{\n  "error": "Not found"\n}\n',
        headers: [
          { key: "Content-Type", value: "application/json", enabled: true },
        ],
      },
    },
    {
      label: "Slow 503",
      stub: {
        method: "*",
        path: "/slow",
        status: 503,
        delayMs: 1500,
        body: '{\n  "error": "Service unavailable"\n}\n',
        headers: [
          { key: "Content-Type", value: "application/json", enabled: true },
        ],
      },
    },
  ];

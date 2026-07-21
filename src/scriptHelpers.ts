import type { EchoServerIncomingRequest } from "@harborclient/sdk/main";
import type { PluginServerHttpResponse } from "./types";

/**
 * Returns whether a script source contains executable code after stripping comments.
 *
 * @param source - User-authored request script.
 */
export function hasExecutableScript(source: string): boolean {
  const withoutBlockComments = source.replace(/\/\*[\s\S]*?\*\//g, "");
  const withoutLineComments = withoutBlockComments.replace(/^\s*\/\/.*$/gm, "");
  return withoutLineComments.trim().length > 0;
}

/**
 * Maps an incoming mock request to hc.scripts request init shape.
 *
 * @param request - Serializable HTTP snapshot from the host plugin server.
 */
export function toScriptRequestInit(request: EchoServerIncomingRequest) {
  return {
    method: request.method,
    url: request.url,
    headers: Object.entries(request.headers).map(([key, value]) => ({
      key,
      value: String(value),
      enabled: true,
    })),
    params: request.params,
    body: request.body,
    bodyType: request.bodyType,
  };
}

/**
 * Returns whether a value is a structured plugin server HTTP response.
 *
 * @param value - Candidate return value from a stub script.
 */
export function isPluginServerHttpResponse(
  value: unknown
): value is PluginServerHttpResponse {
  return Boolean(
    value &&
      typeof value === "object" &&
      (value as { kind?: unknown }).kind === "http-response"
  );
}

/**
 * Builds a post-phase response snapshot from a planned structured HTTP response.
 *
 * @param planned - Response about to be returned to the host.
 */
export function toResponseInit(planned: PluginServerHttpResponse) {
  const status = typeof planned.status === "number" ? planned.status : 200;
  const headers =
    planned.headers && typeof planned.headers === "object"
      ? { ...planned.headers }
      : {};
  let body = "";
  if (typeof planned.body === "string") {
    body = planned.body;
  } else if (planned.body != null) {
    try {
      body = JSON.stringify(planned.body);
    } catch {
      body = String(planned.body);
    }
  }
  const sizeBytes = new TextEncoder().encode(body).length;
  return {
    status,
    statusText: statusTextFor(status),
    headers,
    body,
    timeMs: 0,
    sizeBytes,
  };
}

/**
 * Maps common HTTP status codes to a short status text for script context seeding.
 *
 * @param status - HTTP status code.
 */
function statusTextFor(status: number): string {
  const known: Record<number, string> = {
    200: "OK",
    201: "Created",
    204: "No Content",
    400: "Bad Request",
    401: "Unauthorized",
    403: "Forbidden",
    404: "Not Found",
    500: "Internal Server Error",
    503: "Service Unavailable",
  };
  return known[status] ?? "";
}

/**
 * Applies a script return value on top of a planned structured response.
 *
 * A structured `{ kind: 'http-response' }` replaces the whole response (delay
 * falls back to the planned delay when omitted). Any other non-null value
 * replaces only `body`, keeping status, headers, and delay.
 *
 * @param base - Planned response before the script return is applied.
 * @param value - Script completion value (`undefined`/`null` keeps `base`).
 * @returns Next planned response.
 */
export function applyScriptReturn(
  base: PluginServerHttpResponse,
  value: unknown
): PluginServerHttpResponse {
  if (value === undefined || value === null) {
    return base;
  }
  if (isPluginServerHttpResponse(value)) {
    return {
      ...value,
      delayMs: value.delayMs ?? base.delayMs,
    };
  }
  return {
    ...base,
    body: value,
  };
}

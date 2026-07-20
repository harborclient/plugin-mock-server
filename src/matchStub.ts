import type { MockStub } from "./types";

/**
 * Request fields used for stub matching.
 */
export interface MatchRequest {
  method: string;
  path: string;
}

/**
 * Returns whether a stub path pattern matches an incoming request path.
 *
 * Exact match when the pattern has no trailing `*`. Otherwise matches when the
 * request path equals the prefix or starts with `prefix/` / equals the prefix
 * for patterns like `/api*` (prefix before `*`).
 *
 * @param pattern - Stub path (`/users` or `/api/*`).
 * @param requestPath - Incoming request path without query string.
 * @returns True when the path matches.
 */
export function pathMatches(pattern: string, requestPath: string): boolean {
  const normalizedPattern = pattern.trim() || "/";
  const normalizedPath = requestPath || "/";

  if (!normalizedPattern.includes("*")) {
    return normalizedPattern === normalizedPath;
  }

  if (normalizedPattern === "*") {
    return true;
  }

  if (normalizedPattern.endsWith("/*")) {
    const prefix = normalizedPattern.slice(0, -1);
    return (
      normalizedPath === prefix.slice(0, -1) ||
      normalizedPath.startsWith(prefix)
    );
  }

  if (normalizedPattern.endsWith("*")) {
    const prefix = normalizedPattern.slice(0, -1);
    return normalizedPath.startsWith(prefix);
  }

  return normalizedPattern === normalizedPath;
}

/**
 * Returns whether a stub method matcher accepts an incoming method.
 *
 * @param stubMethod - Stub method or `*`.
 * @param requestMethod - Incoming HTTP method.
 * @returns True when the method matches.
 */
export function methodMatches(
  stubMethod: string,
  requestMethod: string
): boolean {
  const stub = stubMethod.trim().toUpperCase();
  const method = requestMethod.trim().toUpperCase();
  return stub === "*" || stub === method;
}

/**
 * Finds the first enabled stub that matches the request, ordered by priority.
 *
 * @param stubs - Stub registry (any order).
 * @param request - Incoming method and path.
 * @returns The winning stub, or `undefined` when none match.
 */
export function findMatchingStub(
  stubs: MockStub[],
  request: MatchRequest
): MockStub | undefined {
  const ordered = [...stubs].sort(
    (a, b) => a.priority - b.priority || a.id.localeCompare(b.id)
  );
  return ordered.find(
    (stub) =>
      stub.enabled &&
      methodMatches(stub.method, request.method) &&
      pathMatches(stub.path, request.path)
  );
}

import type {
  EchoServerIncomingRequest,
  MainPluginContext,
} from "@harborclient/sdk/main";
import { createLogger } from "@harborclient/sdk/runtime-utils";
import { findMatchingStub } from "./matchStub";
import {
  applyScriptReturn,
  hasExecutableScript,
  toResponseInit,
  toScriptRequestInit,
} from "./scriptHelpers";
import type {
  MockStub,
  MockServerUiStatus,
  PluginServerHttpResponse,
} from "./types";

const logger = createLogger("mock-server");

let stubs: MockStub[] = [];
let running = false;
let listenPort: number | undefined;
let hitCount = 0;

/**
 * Builds response headers from enabled stub header rows.
 *
 * @param stub - Matched stub.
 * @returns Flat header map for the host.
 */
function stubHeaders(stub: MockStub): Record<string, string> {
  const headers: Record<string, string> = {};
  for (const row of stub.headers) {
    if (!row.enabled) {
      continue;
    }
    const key = row.key.trim();
    if (!key) {
      continue;
    }
    headers[key] = row.value;
  }
  return headers;
}

/**
 * Parses stub body text into a JSON value when possible; otherwise returns the string.
 *
 * @param bodyText - Editor body text.
 * @returns Parsed JSON or the raw string.
 */
function parseStubBody(bodyText: string): unknown {
  const trimmed = bodyText.trim();
  if (!trimmed) {
    return null;
  }
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return bodyText;
  }
}

/**
 * Builds a structured host response from a matched stub.
 *
 * @param stub - Matching stub.
 * @returns Structured HTTP response for the plugin server host.
 */
function responseFromStub(stub: MockStub): PluginServerHttpResponse {
  return {
    kind: "http-response",
    status: stub.status,
    headers: stubHeaders(stub),
    body: parseStubBody(stub.body),
    delayMs: stub.delayMs,
  };
}

/**
 * Builds the default 404 when no stub matches.
 *
 * @param request - Incoming request snapshot.
 * @returns Structured 404 response.
 */
function notFoundResponse(
  request: EchoServerIncomingRequest
): PluginServerHttpResponse {
  return {
    kind: "http-response",
    status: 404,
    headers: { "Content-Type": "application/json" },
    body: {
      error: "No stub matched",
      method: request.method,
      path: request.path,
    },
  };
}

/**
 * Runs a stub script and applies its return value to a planned response.
 *
 * @param hc - Main plugin context for the script sandbox.
 * @param phase - Script phase (`pre` for Before, `post` for After).
 * @param source - User script source.
 * @param request - Incoming request snapshot.
 * @param planned - Current planned response.
 * @returns Next planned response (unchanged when the script is empty or errors).
 */
function runStubScript(
  hc: MainPluginContext,
  phase: "pre" | "post",
  source: string,
  request: EchoServerIncomingRequest,
  planned: PluginServerHttpResponse
): PluginServerHttpResponse {
  const trimmed = source.trim();
  if (!hasExecutableScript(trimmed)) {
    return planned;
  }

  const context = hc.scripts.createContext({
    phase,
    request: toScriptRequestInit(request),
    variables: {},
    ...(phase === "post" ? { response: toResponseInit(planned) } : {}),
  });

  const result = context.run(trimmed);
  if (result.error) {
    logger.error(`${phase} script error:`, result.error);
    return planned;
  }

  return applyScriptReturn(planned, result.value);
}

/**
 * Returns the UI status payload for renderer IPC.
 */
function currentStatus(): MockServerUiStatus {
  return {
    running,
    port: listenPort,
    hitCount,
    stubCount: stubs.length,
  };
}

/**
 * Reassigns priority from list order (index = priority) and fills missing script fields.
 *
 * @param next - Stubs in display order.
 * @returns Stubs with updated priorities and script defaults.
 */
function withPriorities(next: MockStub[]): MockStub[] {
  return next.map((stub, index) => ({
    ...stub,
    priority: index,
    beforeScript:
      typeof stub.beforeScript === "string" ? stub.beforeScript : "",
    afterScript: typeof stub.afterScript === "string" ? stub.afterScript : "",
  }));
}

/**
 * Activates the main-process half: mock server, stub registry, and IPC bridge.
 *
 * @param hc - Main plugin context from the HarborClient host.
 */
export function activate(hc: MainPluginContext): void {
  hc.subscriptions.push(
    hc.server.onRequest(async (request: EchoServerIncomingRequest) => {
      hitCount += 1;
      const match = findMatchingStub(stubs, {
        method: request.method,
        path: request.path,
      });
      if (!match) {
        logger.info("no stub matched", request.method, request.path);
        return notFoundResponse(request);
      }
      logger.info("matched stub", match.id, request.method, request.path);

      let planned = responseFromStub(match);
      planned = runStubScript(
        hc,
        "pre",
        match.beforeScript ?? "",
        request,
        planned
      );
      planned = runStubScript(
        hc,
        "post",
        match.afterScript ?? "",
        request,
        planned
      );
      return planned;
    })
  );

  hc.subscriptions.push(
    hc.ipc.handle("start", async (...args: unknown[]) => {
      const payload = (args[0] ?? {}) as { port?: number };
      const port = Number(payload.port ?? 0);
      const result = await hc.server.start({
        port: Number.isFinite(port) ? port : 0,
      });
      running = true;
      listenPort = result.port;
      hitCount = 0;
      return currentStatus();
    })
  );

  hc.subscriptions.push(
    hc.ipc.handle("stop", async () => {
      await hc.server.stop();
      running = false;
      listenPort = undefined;
      return currentStatus();
    })
  );

  hc.subscriptions.push(hc.ipc.handle("status", async () => currentStatus()));

  hc.subscriptions.push(
    hc.ipc.handle("getStubs", async () => withPriorities(stubs))
  );

  hc.subscriptions.push(
    hc.ipc.handle("setStubs", async (...args: unknown[]) => {
      const payload = (args[0] ?? {}) as { stubs?: MockStub[] };
      stubs = withPriorities(Array.isArray(payload.stubs) ? payload.stubs : []);
      return withPriorities(stubs);
    })
  );

  hc.subscriptions.push(
    hc.ipc.handle("resetHitCount", async () => {
      hitCount = 0;
      return currentStatus();
    })
  );
}

/**
 * Stops the mock server when the plugin main entry deactivates.
 *
 * @param hc - Main plugin context from the HarborClient host.
 */
export async function deactivate(hc: MainPluginContext): Promise<void> {
  if (running) {
    await hc.server.stop();
    running = false;
    listenPort = undefined;
  }
}

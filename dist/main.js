// node_modules/.pnpm/@harborclient+sdk@1.1.24_@babel+runtime@8.0.0_@codemirror+search@6.7.1_@codemirror+them_20832a5f7d7bd9c9c76cb9ed7d5bf061/node_modules/@harborclient/sdk/dist/runtime-utils.js
var LOG_LEVEL_RANK = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 4
};
function createLogger(pluginId, options) {
  const prefix = `[${pluginId}]`;
  let level = options?.level ?? "info";
  function log(messageLevel, write, ...args) {
    if (LOG_LEVEL_RANK[messageLevel] < LOG_LEVEL_RANK[level]) {
      return;
    }
    write(prefix, ...args);
  }
  const consoleLog = (...values) => {
    console.log(...values);
  };
  return {
    debug(...args) {
      log("debug", consoleLog, ...args);
    },
    info(...args) {
      log("info", consoleLog, ...args);
    },
    warn(...args) {
      const write = typeof console.warn === "function" ? (...values) => {
        console.warn(...values);
      } : consoleLog;
      log("warn", write, ...args);
    },
    error(...args) {
      const write = typeof console.error === "function" ? (...values) => {
        console.error(...values);
      } : consoleLog;
      log("error", write, ...args);
    },
    setLevel(nextLevel) {
      level = nextLevel;
    }
  };
}

// src/matchStub.ts
function pathMatches(pattern, requestPath) {
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
    return normalizedPath === prefix.slice(0, -1) || normalizedPath.startsWith(prefix);
  }
  if (normalizedPattern.endsWith("*")) {
    const prefix = normalizedPattern.slice(0, -1);
    return normalizedPath.startsWith(prefix);
  }
  return normalizedPattern === normalizedPath;
}
function methodMatches(stubMethod, requestMethod) {
  const stub = stubMethod.trim().toUpperCase();
  const method = requestMethod.trim().toUpperCase();
  return stub === "*" || stub === method;
}
function findMatchingStub(stubs2, request) {
  const ordered = [...stubs2].sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id));
  return ordered.find(
    (stub) => stub.enabled && methodMatches(stub.method, request.method) && pathMatches(stub.path, request.path)
  );
}

// src/main.ts
var logger = createLogger("mock-server");
var stubs = [];
var running = false;
var listenPort;
var hitCount = 0;
function stubHeaders(stub) {
  const headers = {};
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
function parseStubBody(bodyText) {
  const trimmed = bodyText.trim();
  if (!trimmed) {
    return null;
  }
  try {
    return JSON.parse(trimmed);
  } catch {
    return bodyText;
  }
}
function responseFromStub(stub) {
  return {
    kind: "http-response",
    status: stub.status,
    headers: stubHeaders(stub),
    body: parseStubBody(stub.body),
    delayMs: stub.delayMs
  };
}
function notFoundResponse(request) {
  return {
    kind: "http-response",
    status: 404,
    headers: { "Content-Type": "application/json" },
    body: {
      error: "No stub matched",
      method: request.method,
      path: request.path
    }
  };
}
function currentStatus() {
  return {
    running,
    port: listenPort,
    hitCount,
    stubCount: stubs.length
  };
}
function withPriorities(next) {
  return next.map((stub, index) => ({ ...stub, priority: index }));
}
function activate(hc) {
  hc.subscriptions.push(
    hc.server.onRequest(async (request) => {
      hitCount += 1;
      const match = findMatchingStub(stubs, {
        method: request.method,
        path: request.path
      });
      if (!match) {
        logger.info("no stub matched", request.method, request.path);
        return notFoundResponse(request);
      }
      logger.info("matched stub", match.id, request.method, request.path);
      return responseFromStub(match);
    })
  );
  hc.subscriptions.push(
    hc.ipc.handle("start", async (...args) => {
      const payload = args[0] ?? {};
      const port = Number(payload.port ?? 0);
      const result = await hc.server.start({
        port: Number.isFinite(port) ? port : 0
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
      listenPort = void 0;
      return currentStatus();
    })
  );
  hc.subscriptions.push(
    hc.ipc.handle("status", async () => currentStatus())
  );
  hc.subscriptions.push(
    hc.ipc.handle("getStubs", async () => withPriorities(stubs))
  );
  hc.subscriptions.push(
    hc.ipc.handle("setStubs", async (...args) => {
      const payload = args[0] ?? {};
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
async function deactivate(hc) {
  if (running) {
    await hc.server.stop();
    running = false;
    listenPort = void 0;
  }
}
export {
  activate,
  deactivate
};

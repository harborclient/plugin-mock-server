import { describe, expect, it } from "vitest";
import {
  applyScriptReturn,
  hasExecutableScript,
  isPluginServerHttpResponse,
  toResponseInit,
} from "./scriptHelpers";
import type { PluginServerHttpResponse } from "./types";

describe("hasExecutableScript", () => {
  it("returns false for empty or comment-only sources", () => {
    expect(hasExecutableScript("")).toBe(false);
    expect(hasExecutableScript("   \n  ")).toBe(false);
    expect(hasExecutableScript("// just a comment")).toBe(false);
    expect(hasExecutableScript("/* block */\n// line")).toBe(false);
  });

  it("returns true when executable code remains", () => {
    expect(hasExecutableScript("return { ok: true };")).toBe(true);
    expect(hasExecutableScript("// setup\n1 + 1")).toBe(true);
  });
});

describe("isPluginServerHttpResponse", () => {
  it("detects structured http-response values", () => {
    expect(
      isPluginServerHttpResponse({ kind: "http-response", status: 201 })
    ).toBe(true);
    expect(isPluginServerHttpResponse({ status: 200 })).toBe(false);
    expect(isPluginServerHttpResponse(null)).toBe(false);
  });
});

describe("applyScriptReturn", () => {
  const base: PluginServerHttpResponse = {
    kind: "http-response",
    status: 200,
    headers: { "Content-Type": "application/json" },
    body: { ok: true },
    delayMs: 100,
  };

  it("keeps the base when the return value is nullish", () => {
    expect(applyScriptReturn(base, undefined)).toEqual(base);
    expect(applyScriptReturn(base, null)).toEqual(base);
  });

  it("replaces only the body for ordinary return values", () => {
    expect(applyScriptReturn(base, { overridden: true })).toEqual({
      ...base,
      body: { overridden: true },
    });
    expect(applyScriptReturn(base, "plain text")).toEqual({
      ...base,
      body: "plain text",
    });
  });

  it("replaces the whole response for structured returns and falls back delay", () => {
    expect(
      applyScriptReturn(base, {
        kind: "http-response",
        status: 503,
        headers: { "X-Mock": "1" },
        body: { error: "down" },
      })
    ).toEqual({
      kind: "http-response",
      status: 503,
      headers: { "X-Mock": "1" },
      body: { error: "down" },
      delayMs: 100,
    });

    expect(
      applyScriptReturn(base, {
        kind: "http-response",
        status: 201,
        body: null,
        delayMs: 5,
      })
    ).toEqual({
      kind: "http-response",
      status: 201,
      body: null,
      delayMs: 5,
    });
  });
});

describe("toResponseInit", () => {
  it("stringifies object bodies and reports size", () => {
    const init = toResponseInit({
      kind: "http-response",
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: { ok: true },
    });
    expect(init.status).toBe(200);
    expect(init.statusText).toBe("OK");
    expect(init.headers).toEqual({ "Content-Type": "application/json" });
    expect(init.body).toBe('{"ok":true}');
    expect(init.timeMs).toBe(0);
    expect(init.sizeBytes).toBe(new TextEncoder().encode('{"ok":true}').length);
  });

  it("preserves string bodies and empty status text for unknown codes", () => {
    const init = toResponseInit({
      kind: "http-response",
      status: 418,
      body: "teapot",
    });
    expect(init.body).toBe("teapot");
    expect(init.statusText).toBe("");
    expect(init.headers).toEqual({});
  });
});

import { describe, expect, it } from "vitest";
import { findMatchingStub, methodMatches, pathMatches } from "./matchStub";
import { createDefaultStub } from "./types";

describe("pathMatches", () => {
  it("matches exact paths", () => {
    expect(pathMatches("/users", "/users")).toBe(true);
    expect(pathMatches("/users", "/users/1")).toBe(false);
  });

  it("matches trailing slash-star prefixes", () => {
    expect(pathMatches("/api/*", "/api")).toBe(true);
    expect(pathMatches("/api/*", "/api/")).toBe(true);
    expect(pathMatches("/api/*", "/api/v1")).toBe(true);
    expect(pathMatches("/api/*", "/other")).toBe(false);
  });

  it("matches trailing star prefixes", () => {
    expect(pathMatches("/api*", "/api")).toBe(true);
    expect(pathMatches("/api*", "/api/v1")).toBe(true);
    expect(pathMatches("*", "/anything")).toBe(true);
  });
});

describe("methodMatches", () => {
  it("matches exact methods and wildcard", () => {
    expect(methodMatches("GET", "get")).toBe(true);
    expect(methodMatches("POST", "GET")).toBe(false);
    expect(methodMatches("*", "DELETE")).toBe(true);
  });
});

describe("findMatchingStub", () => {
  it("returns the first enabled stub by priority", () => {
    const low = createDefaultStub({
      id: "a",
      priority: 1,
      method: "GET",
      path: "/x",
    });
    const high = createDefaultStub({
      id: "b",
      priority: 0,
      method: "GET",
      path: "/x",
    });
    expect(
      findMatchingStub([low, high], { method: "GET", path: "/x" })?.id
    ).toBe("b");
  });

  it("skips disabled stubs", () => {
    const disabled = createDefaultStub({
      id: "a",
      enabled: false,
      method: "GET",
      path: "/x",
    });
    expect(
      findMatchingStub([disabled], { method: "GET", path: "/x" })
    ).toBeUndefined();
  });
});

import { afterEach, describe, expect, it } from "vitest";

import { getBasePath, withBasePath } from "./base-path";

const env = process.env;

afterEach(() => {
  process.env = { ...env };
});

describe("base-path", () => {
  it("returns empty path locally without env", () => {
    delete process.env.NEXT_PUBLIC_BASE_PATH;
    delete process.env.VERCEL;
    expect(getBasePath()).toBe("");
    expect(withBasePath("/login")).toBe("/login");
  });

  it("honours NEXT_PUBLIC_BASE_PATH", () => {
    process.env.NEXT_PUBLIC_BASE_PATH = "/wa-automation";
    expect(getBasePath()).toBe("/wa-automation");
    expect(withBasePath("/dashboard")).toBe("/wa-automation/dashboard");
  });

  it("defaults to /wa-automation on Vercel when unset", () => {
    delete process.env.NEXT_PUBLIC_BASE_PATH;
    process.env.VERCEL = "1";
    expect(getBasePath()).toBe("/wa-automation");
  });
});

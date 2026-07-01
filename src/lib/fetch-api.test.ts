import { afterEach, describe, expect, it } from "vitest";

import { apiPath } from "./fetch-api";

const env = process.env;

afterEach(() => {
  process.env = { ...env };
});

describe("fetch-api", () => {
  it("prefixes API paths with basePath", () => {
    process.env.NEXT_PUBLIC_BASE_PATH = "/wa-automation";
    expect(apiPath("/api/account/invitations")).toBe(
      "/wa-automation/api/account/invitations",
    );
  });

  it("leaves paths unchanged without basePath", () => {
    delete process.env.NEXT_PUBLIC_BASE_PATH;
    delete process.env.VERCEL;
    expect(apiPath("/api/account/invitations")).toBe(
      "/api/account/invitations",
    );
  });
});

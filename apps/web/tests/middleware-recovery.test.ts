import { NextRequest } from "next/server";
import { afterEach, expect, test, vi } from "vitest";
import { middleware } from "../src/middleware";

vi.mock("@wodge/env/client", () => ({
  env: { NEXT_PUBLIC_BACKEND_DOMAIN: "http://backend.test" },
}));
afterEach(() => {
  vi.unstubAllGlobals();
});

test("backend network failure shows recovery without admitting a protected page", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      throw new TypeError("fetch failed");
    }),
  );
  const response = await middleware(
    new NextRequest("http://app.test/workspace/settings?tab=members"),
  );
  expect(response.status).toBe(307);
  const rewrite = new URL(response.headers.get("location")!);
  expect(rewrite.pathname).toBe("/unavailable");
  expect(rewrite.searchParams.get("returnTo")).toBe(
    "/workspace/settings?tab=members",
  );
});

test("a backend outage keeps sign-in reachable without inventing a session", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      throw new TypeError("fetch failed");
    }),
  );
  const response = await middleware(new NextRequest("http://app.test/login"));
  expect(response.headers.get("x-middleware-next")).toBe("1");
  expect(response.headers.get("set-cookie")).toBeNull();
});

test("expired-session navigation preserves the complete local return path", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(null, { status: 401 })),
  );
  const response = await middleware(
    new NextRequest("http://app.test/workspace/settings?tab=members"),
  );
  const redirect = new URL(response.headers.get("location")!);
  expect(redirect.pathname).toBe("/login");
  expect(redirect.searchParams.get("redirect")).toBe(
    "/workspace/settings?tab=members",
  );
});

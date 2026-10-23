import { afterEach, expect, test, vi } from "vitest";
import { fetchBackend } from "../src/lib/backend";

const bindingFetch = vi.hoisted(() => vi.fn());
vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: () => ({ env: { BACKEND: { fetch: bindingFetch } } }),
}));
vi.mock("@wodge/env/client", () => ({
  env: { NEXT_PUBLIC_BACKEND_DOMAIN: "https://app.test" },
}));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

test("production server requests use the backend binding and preserve cookies", async () => {
  vi.stubEnv("NODE_ENV", "production");
  const publicFetch = vi.fn();
  vi.stubGlobal("fetch", publicFetch);
  const response = new Response(null, { status: 401 });
  bindingFetch.mockResolvedValue(response);
  const init = {
    headers: { cookie: "session=example" },
    cache: "no-store" as const,
  };
  expect(await fetchBackend("/api/users/me", init)).toBe(response);
  expect(bindingFetch).toHaveBeenCalledWith(
    new URL("https://app.test/api/users/me"),
    init,
  );
  expect(publicFetch).not.toHaveBeenCalled();
});

test("local Next development uses HTTP to reach the local backend", async () => {
  vi.stubEnv("NODE_ENV", "development");
  const publicFetch = vi
    .fn()
    .mockResolvedValue(new Response(null, { status: 401 }));
  vi.stubGlobal("fetch", publicFetch);
  await fetchBackend("/api/users/me");
  expect(publicFetch).toHaveBeenCalledWith(
    new URL("https://app.test/api/users/me"),
    undefined,
  );
  expect(bindingFetch).not.toHaveBeenCalled();
});

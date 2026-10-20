import { afterEach, beforeEach, expect, test, vi } from "vitest";
import type { PullRequest, PushRequest } from "replicache";
import {
  replicacheWrapper,
  syncStatusEvent,
} from "../src/client/sync/transport";
import {
  accessFailureEvent,
  failureMessage,
  requireOk,
  RequestFailure,
} from "../src/client/errors";

vi.mock("@wodge/env/client", () => ({
  env: { NEXT_PUBLIC_AVATARS_URL: "http://localhost" },
}));
const push: PushRequest = {
  pushVersion: 1,
  schemaVersion: "",
  profileID: "profile",
  clientGroupID: "group",
  mutations: [],
};
const pull: PullRequest = {
  pullVersion: 1,
  schemaVersion: "",
  profileID: "profile",
  clientGroupID: "group",
  cookie: null,
};
const statuses: unknown[] = [];
function status(event: Event) {
  if (event instanceof CustomEvent) statuses.push(event.detail);
}
beforeEach(() => {
  statuses.length = 0;
  window.addEventListener(syncStatusEvent, status);
});
afterEach(() => {
  vi.unstubAllGlobals();
  window.removeEventListener(syncStatusEvent, status);
});

test("empty successful pushes remain successful and retain credentials and target headers", async () => {
  const fetch = vi.fn(async () => new Response(null, { status: 204 }));
  vi.stubGlobal("fetch", fetch);
  const result = await replicacheWrapper(
    "push",
    "room",
    "room",
  )(push, "request");
  expect(result.httpRequestInfo).toEqual({
    httpStatusCode: 204,
    errorMessage: "",
  });
  expect(fetch.mock.calls[0]).toEqual([
    "/api/replicache/push",
    expect.objectContaining({
      credentials: "include",
      headers: expect.objectContaining({
        domain: "room",
        id: "room",
        "content-type": "application/json",
      }),
    }),
  ]);
});

test("push protocol errors are passed back to Replicache", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Response.json({ error: "ClientStateNotFound" })),
  );
  expect(
    (await replicacheWrapper("push", "room", "room")(push, "request")).response,
  ).toEqual({ error: "ClientStateNotFound" });
});

test.each([401, 403, 503])(
  "failed pull exposes HTTP %s and never supplies a success patch",
  async (statusCode) => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json(
          {
            error: {
              code: "INTEGRATION_UNAVAILABLE",
              message: "private diagnostics",
            },
          },
          { status: statusCode },
        ),
      ),
    );
    const result = await replicacheWrapper(
      "pull",
      "room",
      "room",
    )(pull, "request");
    expect(result.httpRequestInfo.httpStatusCode).toBe(statusCode);
    expect(result.response).toBeUndefined();
    expect(result.httpRequestInfo.errorMessage).not.toContain("private");
    expect(statuses).toEqual([
      expect.objectContaining({ message: expect.any(String) }),
    ]);
  },
);

test("network failure keeps pending work unacknowledged and performs no additional write", async () => {
  const fetch = vi.fn(async () => {
    throw new TypeError("fetch failed");
  });
  vi.stubGlobal("fetch", fetch);
  const result = await replicacheWrapper(
    "push",
    "room",
    "room",
  )(push, "request");
  expect(result.httpRequestInfo.httpStatusCode).toBe(0);
  expect(result.httpRequestInfo.errorMessage).toMatch(/connection/);
  expect(fetch).toHaveBeenCalledOnce();
});

test("legacy plain text permission errors still trigger access recovery", async () => {
  const listener = vi.fn();
  window.addEventListener(accessFailureEvent, listener);
  try {
    await expect(
      requireOk(new Response("Forbidden", { status: 403 })),
    ).rejects.toBeInstanceOf(RequestFailure);
    expect(listener).toHaveBeenCalledOnce();
  } finally {
    window.removeEventListener(accessFailureEvent, listener);
  }
});

test("validation and integration errors produce safe recovery guidance", async () => {
  for (const status of [400, 401, 403, 429, 503]) {
    let error: unknown;
    try {
      await requireOk(
        Response.json(
          { error: { code: "INTERNAL_ERROR", message: "private diagnostics" } },
          { status },
        ),
      );
    } catch (failure) {
      error = failure;
    }
    expect(failureMessage(error)).not.toContain("private");
  }
});

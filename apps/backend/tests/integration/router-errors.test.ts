import { ResourceGrantCache } from "@wodge/auth/authorization/grants";
import { WorkspaceAccess } from "@wodge/auth/authorization/workspace-access";
import { BetterAuthMembership } from "@wodge/auth/membership";
import { RoomsHandlers } from "../../src/handlers/rooms/handlers";
import { Hono } from "hono";
import { YServer } from "y-partyserver";
import { createRuntimeContainer } from "../../src/container";
import type RoomParty from "../../src/servers/room";
import type { WorkerEnvironment } from "../../src/types/worker-environment";
import { roomAuthorizationFixture } from "../helpers/authorization";
import type { TestRouteResources } from "../helpers/routes";
// @vitest-environment node
import { ApplicationError } from "@wodge/core/errors";
import { roomsError } from "@wodge/core/rooms/errors";
import { afterEach, expect, test, vi } from "vitest";
import { handleError, handleIngress } from "../../src/errors/handler";
import { applicationErrorStatus } from "../../src/errors/mappings";
import type PageParty from "../../src/servers/page";
import PageServer from "../../src/servers/page";
import { pageBindings } from "../helpers/bindings";
import {
  discussionsRoutes,
  pagesRoutes,
  roomsRoutes,
  userRoutes,
  workspaceRoutes,
} from "../helpers/routes";

vi.mock("@wodge/auth/membership", () => ({
  BetterAuthMembership: class {
    async hasMember() {
      return true;
    }
  },
}));

afterEach(() => {
  vi.restoreAllMocks();
});

function roomBindings(issue: () => Promise<string>): TestRouteResources {
  const party = {
    name: "room",
    authorization: roomAuthorizationFixture(),
    ctx: { storage: {} },
    env: {},
  } as unknown as RoomParty;
  const container = createRuntimeContainer(party.env, {
    type: "room",
    instance: party,
  });
  container.registerInstance(ResourceGrantCache, roomAuthorizationFixture());

  // Inject a failing handler to exercise the production router's global error boundary.
  vi.spyOn(
    container.resolve(RoomsHandlers),
    "generateCallToken",
  ).mockImplementation(async () => {
    await issue();
    throw new Error("Unreachable error fixture");
  });

  return {
    container,
    sync: {
      storage: {} as DurableObjectStorage,
      versions: new Map([["globalVersion", 0]]),
      run: async () => {},
      patch: () => async () => [],
      notify: async () => new Response(),
    },
  };
}

test("the room router maps an application error without exposing host state", async () => {
  const response = await roomsRoutes.request(
    "http://localhost/parties/room/one/token",
    { headers: { "x-user-id": "owner", "x-session-id": "session" } },
    roomBindings(async () => {
      throw roomsError("ROOM_FORBIDDEN", "Call is unavailable");
    }),
  );

  expect(response.status).toBe(403);
  expect(await response.json()).toEqual({
    ok: false,
    error: { code: "ROOM_FORBIDDEN", message: "Call is unavailable" },
  });
});

test("unexpected route failures are logged and returned without internal details", async () => {
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  const failure = new Error("secret provider configuration");
  const response = await roomsRoutes.request(
    "http://localhost/parties/room/one/token",
    { headers: { "x-user-id": "owner", "x-session-id": "session" } },
    roomBindings(async () => {
      throw failure;
    }),
  );

  expect(response.status).toBe(500);
  expect(await response.text()).not.toContain("secret");
  expect(log).toHaveBeenCalledWith(
    "Unhandled backend error",
    expect.objectContaining({ type: "Error" }),
  );
  expect(JSON.stringify(log.mock.calls)).not.toContain(
    "secret provider configuration",
  );
});

test.each(Object.entries(applicationErrorStatus))(
  "application code %s has a deliberate HTTP mapping",
  async (code, status) => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const response = handleError(
      new ApplicationError(code, "Expected failure", { resourceId: "one" }),
    );

    expect(response.status).toBe(status);
    expect(await response.json()).toMatchObject({
      error: { code, details: { resourceId: "one" } },
    });
  },
);

test("unknown application codes use the safe unexpected-error response", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  const response = handleError(
    new ApplicationError("UNKNOWN_CODE", "private details"),
  );

  expect(response.status).toBe(500);
  expect(await response.text()).not.toContain("private");
});

test.each([
  ["pages", pagesRoutes, "page"],
  ["rooms", roomsRoutes, "room"],
  ["discussions", discussionsRoutes, "thread"],
  ["user", userRoutes, "user"],
  ["workspace", workspaceRoutes, "workspace"],
] as const)(
  "%s router returns a structured error for malformed JSON",
  async (_feature, router, party) => {
    // Authentication precedes parsing. No operation or persistence may run on malformed input.
    const sync = {
      storage: {} as DurableObjectStorage,
      versions: new Map([["globalVersion", 0]]),
      run: vi.fn(),
      patch: () => async () => [],
      notify: async () => new Response(),
    };
    const container = createRuntimeContainer({} as WorkerEnvironment);
    container.registerInstance(BetterAuthMembership, {
      hasMember: async () => true,
    } as never);
    container.registerInstance(WorkspaceAccess, {
      hasMember: () => true,
    } as never);
    container.registerInstance(
      ResourceGrantCache,
      roomAuthorizationFixture("one"),
    );
    const env = { sync, workspaceId: "workspace", container };
    const response = await router.request(
      `http://localhost/parties/${party}/one/replicache-push`,
      {
        method: "POST",
        headers: {
          "x-user-id": "owner",
          "x-session-id": "session",
          "x-workspace-id": "workspace",
          "x-owner": "true",
        },
        body: "{",
      },
      env as never,
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: { code: "HTTP_ERROR", message: "Malformed JSON" },
    });
    expect(sync.run).not.toHaveBeenCalled();
  },
);

test("ingress exceptions use the same error mapper as Hono routes", async () => {
  const result = await handleIngress(async () => {
    throw roomsError("ROOM_NOT_FOUND", "Room missing");
  });

  expect(result.status).toBe(404);
});

test("page startup waits for storage and rejects read failures", async () => {
  vi.spyOn(YServer.prototype, "onStart").mockResolvedValue(undefined);
  let release: (record: unknown) => void = () => {};
  const pending = new Promise((resolve) => {
    release = resolve;
  });
  const party = {
    name: "fixture",
    ctx: {
      storage: {
        get: vi
          .fn()
          .mockReturnValueOnce(pending)
          .mockResolvedValueOnce(new Map([["globalVersion", 0]])),
      },
    },
    env: {},
  } as unknown as PageParty;
  let finished = false;
  const start = PageServer.prototype.onStart.call(party).then(() => {
    finished = true;
  });

  await Promise.resolve();
  expect(finished).toBe(false);
  release({
    data: { columns: [], tasks: [] },
    lastModifiedVersion: 0,
    deleted: false,
  });

  await start;
  expect(party.state.record.data.columns).toEqual([]);
  const failure = new Error("read unavailable");

  party.ctx.storage.get = vi.fn().mockRejectedValue(failure);
  vi.spyOn(console, "error").mockImplementation(() => {});

  await expect(PageServer.prototype.onStart.call(party)).rejects.toMatchObject({
    message: "Internal server error",
    cause: failure,
  });
});

test("a shared page router isolates request bindings for different objects", async () => {
  function party() {
    return {
      state: {
        record: {
          data: { columns: [], tasks: [] },
          lastModifiedVersion: 0,
          deleted: false,
        },
      },
      versions: new Map([["globalVersion", 0]]),
      name: "fixture",
      ctx: { storage: {} },
      env: { ...{} },
    } as unknown as PageParty;
  }
  const one = party(),
    two = party();

  one.state.record.data.columns = [{ id: "first" }];
  one.state.record.lastModifiedVersion = 1;
  // Pull through independent bindings with a seeded in-memory storage adapter.

  for (const p of [one, two]) {
    Object.assign(p.ctx.storage, {
      get: vi.fn(async () => undefined),
      list: vi.fn(async () => new Map()),
    });
  }

  const request = async (p: PageParty, id: string) =>
    pagesRoutes.request(
      `http://localhost/parties/page/${id}/replicache-pull`,
      {
        method: "POST",
        headers: { "x-user-id": "owner", "x-can-view": "true" },
        body: JSON.stringify({ cookie: null, clientGroupID: "group" }),
      },
      pageBindings(p),
    );
  const [first, second] = await Promise.all([
    request(one, "one"),
    request(two, "two"),
  ]);

  expect(((await first.json()) as { patch: unknown[] }).patch).toContainEqual({
    op: "put",
    key: "columns",
    value: [{ id: "first" }],
  });
  expect(((await second.json()) as { patch: unknown[] }).patch).toEqual([]);
});

test("validation errors from a route produce field information", async () => {
  const { z } = await import("zod");
  const response = await roomsRoutes.request(
    "http://localhost/parties/room/one/token",
    { headers: { "x-user-id": "owner", "x-session-id": "session" } },
    roomBindings(async () => {
      z.object({ userId: z.string() }).parse({ userId: 5 });

      return "unreachable";
    }),
  );

  expect(response.status).toBe(400);
  expect(await response.json()).toMatchObject({
    error: { code: "VALIDATION_FAILED", issues: [{ path: ["userId"] }] },
  });
});

test("workspace administrative guards protect only their explicit endpoints", async () => {
  const { workspaceBindings } = await import("../helpers/bindings");
  const party = {
    workspaceMembers: {
      data: { createdBy: "owner", members: [{ id: "member", role: "member" }] },
    },
    workspaceStructure: { data: { teams: [], groups: [] } },
    versions: new Map([["globalVersion", 0]]),
    poke: vi.fn(async () => {}),
    name: "one",
    ctx: { storage: { get: async () => undefined, put: async () => {} } },
    env: { ...{} },
  } as unknown as import("../../src/servers/workspace").default;
  const env = workspaceBindings(party);
  const headers = { "x-user-id": "member" };

  expect(
    (
      await workspaceRoutes.request(
        "http://localhost/parties/workspace/one/avatar",
        { method: "POST", headers },
        env,
      )
    ).status,
  ).toBe(401);
  const response = await workspaceRoutes.request(
    "http://localhost/parties/workspace/one/replicache-push",
    {
      method: "POST",
      headers,
      body: JSON.stringify({ clientGroupID: "group", mutations: [] }),
    },
    env,
  );

  expect(response.status).toBe(200);
  expect(party.poke).toHaveBeenCalledOnce();
});

test.each([
  [false, true, 401],
  [true, false, 503],
  [true, true, 200],
] as const)(
  "workspace admission uses D1 membership before its local projection (%s, %s)",
  async (authoritativeMember, projectedMember, status) => {
    const { workspaceMembership } = await import(
      "../../src/middleware/workspace/membership"
    );
    const router = new Hono();
    router.use(
      "*",
      workspaceMembership(
        {
          hasMember: (...args: unknown[]) => hasMember(...(args as [])),
        } as never,
        { hasMember: () => projectedMember } as never,
        "one",
      ) as never,
    );
    router.get("/parties/workspace/one/resource", (c) => c.json({ ok: true }));
    const container = createRuntimeContainer({} as WorkerEnvironment);
    const hasMember = vi.fn(async () => authoritativeMember);
    container.registerInstance(BetterAuthMembership, { hasMember } as never);
    container.registerInstance(WorkspaceAccess, {
      hasMember: () => projectedMember,
    } as never);
    const response = await router.request(
      "http://localhost/parties/workspace/one/resource",
      { headers: { "x-user-id": "member" } },
      { container, workspaceId: "one" },
    );
    expect(response.status).toBe(status);
    expect(hasMember).toHaveBeenCalledWith("member", "one");
  },
);

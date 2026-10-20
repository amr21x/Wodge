import { userServiceFixture } from "../helpers/services";
import {
  roomServiceFixture,
  discussionServiceFixture,
} from "../helpers/services";
import { ObjectSyncRepository } from "@wodge/core/sync/repositories/state";
import { createObjectDatabase } from "@wodge/infra/database/object-database";
import { attachSql } from "../helpers/sqlite";
import { WorkspaceRecordRepository } from "@wodge/core/workspace/repositories/records";
import { Hono } from "hono";
import { handleError } from "../../src/errors/handler";
import { BillingHandlers } from "../../src/handlers/api/billing";
import { WorkspaceFilesHandlers } from "../../src/handlers/workspace/files";
import { dispatchRoomMutation } from "../../src/lib/sync/mutations/rooms";
import type {
  ApiContext,
  WorkspaceContext,
} from "../../src/types/hono-context";
import { createTestEnvironment } from "../helpers/environment";
// @vitest-environment node
// @vitest-environment node
import { BillingService } from "@wodge/core/billing/services/billing";
import { DiscussionService } from "@wodge/core/discussions/services/posts";
import { RoomService } from "@wodge/core/rooms/services/messages";
import { UserService } from "@wodge/core/user/services/memberships";
import {
  defaultWorkspaceMembers,
  defaultWorkspaceStructure,
} from "@wodge/core/workspace/defaults";
import { WorkspaceLifecycleRepository } from "@wodge/core/workspace/repositories/lifecycle";
import { WorkspaceFiles } from "@wodge/core/workspace/services/files";
import { WorkspaceLifecycle } from "@wodge/core/workspace/services/lifecycle";
import { ThreadPostSchema } from "@wodge/domain/discussions/validation";
import { MessageSchema } from "@wodge/domain/rooms/validation";
import { REPLICACHE_VERSIONS_KEY } from "@wodge/domain/sync/index";
import type { PaymentEvent } from "@wodge/infra/payments/types";
import type { ObjectStorage } from "@wodge/infra/storage/types";
import { afterEach, expect, test, vi } from "vitest";
import type WorkspaceParty from "../../src/servers/workspace";
import { executeWorkspaceMutation } from "../helpers/mutations";

const record = <T>(data: T) => ({
  data,
  lastModifiedVersion: 0,
  deleted: false,
});

const actor = {
  userId: "owner",
  isOwner: true,
  isAdmin: false,
  isTeamModerator: false,
  canEdit: false,
  canView: false,
};

const command = (name: string, args: unknown, userId = "owner") => ({
  mutation: { name, args },
  nextVersion: 4,
  userId,
});

function storage() {
  const records = new Map<string, unknown>();

  return {
    records,
    setAlarm: vi.fn(async () => {}),
    get: vi.fn(async (key: string) => structuredClone(records.get(key))),
    put: vi.fn(async (...args: unknown[]) => {
      for (const [key, value] of typeof args[0] === "string"
        ? [[args[0], args[1]]]
        : Object.entries(args[0] as Record<string, unknown>)) {
        records.set(key as string, structuredClone(value));
      }
    }),
  };
}

function workspace() {
  const state = {
    workspaceMembers: record(defaultWorkspaceMembers()),
    workspaceStructure: record(defaultWorkspaceStructure()),
    versions: new Map([["globalVersion", 0]]),
    presenceMap: new Map<string, boolean>(),
  };
  const store = attachSql(storage());
  const removeUserWorkspace = vi.fn(async () => ({ ok: true }));
  const addUserWorkspace = vi.fn(async () => ({ ok: true }));
  const createBucket = vi.fn(async () => {});
  const poke = vi.fn(async () => {});
  const dependencies = {
    state,
    storage: store,
    workspaceId: "workspace",
    removeUserWorkspace,
    addUserWorkspace,
    createBucket,
    poke,
  };
  const party = {
    ...state,
    poke,
    name: "workspace",
    ctx: { storage: store },
    env: {
      User: {
        idFromName: (id: string) => id,
        get: (_id: string) => ({
          setName: async () => {},
          fetch: async (path: string) =>
            path.includes("add-workspace")
              ? addUserWorkspace()
              : removeUserWorkspace(),
        }),
      },
    },
  } as unknown as WorkspaceParty;

  return {
    ...dependencies,
    state: party,
    store,
    service: {
      execute(params: ReturnType<typeof command>) {
        return executeWorkspaceMutation(
          party,
          {
            ...params,
            mutation: { ...params.mutation, id: 1, clientID: "client" },
          },
          { ...actor, userId: params.userId },
        );
      },
    },
    lifecycle: new WorkspaceLifecycle(
      new WorkspaceLifecycleRepository(
        new WorkspaceRecordRepository(
          party.ctx.storage,
          createObjectDatabase(party.ctx.storage),
          new ObjectSyncRepository(
            party.ctx.storage,
            createObjectDatabase(party.ctx.storage),
            "workspace",
          ),
        ),
        new ObjectSyncRepository(
          party.ctx.storage,
          createObjectDatabase(party.ctx.storage),
          "workspace",
        ),
        party,
        createObjectDatabase(party.ctx.storage),
      ),
    ),
  };
}

afterEach(() => {
  vi.useRealTimers();
});

test("workspace lifecycle initializes defaults and persists organization membership projections", async () => {
  const w = workspace();

  expect(await w.lifecycle.createWorkspace("owner")).toBe(true);
  expect(w.state.workspaceMembers.data.members).toMatchObject([
    { id: "owner", role: "owner" },
  ]);
  expect(w.state.workspaceStructure.data.teams[0]).toMatchObject({
    members: ["owner"],
    default: true,
  });
  expect(w.state.versions.get("globalVersion")).toBe(1);
  expect(w.createBucket).not.toHaveBeenCalled();
  await w.lifecycle.synchronizeMembers([
    { userId: "owner", role: "owner" },
    { userId: "member", role: "member" },
  ]);
  expect(w.state.workspaceStructure.data.teams[0]?.members).toEqual([
    "owner",
    "member",
  ]);
  expect(
    (
      await new WorkspaceRecordRepository(
        w.state.ctx.storage,
        createObjectDatabase(w.state.ctx.storage),
        new ObjectSyncRepository(
          w.state.ctx.storage,
          createObjectDatabase(w.state.ctx.storage),
          "workspace",
        ),
      ).loadWorkspace()
    ).workspaceMembers,
  ).toEqual(w.state.workspaceMembers);
  expect(
    await new ObjectSyncRepository(
      w.state.ctx.storage,
      createObjectDatabase(w.state.ctx.storage),
      "workspace",
    ).loadVersions(),
  ).toEqual(w.state.versions);
  expect(w.addUserWorkspace).not.toHaveBeenCalled();
  expect(w.poke).not.toHaveBeenCalled();
});

test("workspace initialization persists local defaults without invoking remote systems", async () => {
  const w = workspace();
  w.addUserWorkspace.mockResolvedValueOnce({ ok: false });
  w.createBucket.mockRejectedValueOnce(new Error("unavailable"));
  expect(await w.lifecycle.createWorkspace("owner")).toBe(true);
  expect(
    (
      await new WorkspaceRecordRepository(
        w.state.ctx.storage,
        createObjectDatabase(w.state.ctx.storage),
        new ObjectSyncRepository(
          w.state.ctx.storage,
          createObjectDatabase(w.state.ctx.storage),
          "workspace",
        ),
      ).loadWorkspace()
    ).workspaceMembers,
  ).toEqual(w.state.workspaceMembers);
  expect(w.addUserWorkspace).not.toHaveBeenCalled();
  expect(w.createBucket).not.toHaveBeenCalled();
});

test("workspace commands deny unauthorized actors and reject legacy organization mutations", async () => {
  const w = workspace();

  await w.lifecycle.createWorkspace("owner");
  await w.lifecycle.synchronizeMembers([
    { userId: "owner", role: "owner" },
    { userId: "member", role: "member" },
  ]);
  const before = w.state.workspaceStructure;

  await w.service.execute(
    command("createTeam", { id: "team-two", name: "Other" }, "member"),
  );
  expect(w.state.workspaceStructure).toBe(before);
  await expect(
    w.service.execute(command("removeMember", "member")),
  ).rejects.toThrow(
    "Organization membership and roles are managed through Better Auth",
  );
  await expect(
    w.service.execute(
      command("changeMemberRole", { memberId: "member", role: "admin" }),
    ),
  ).rejects.toThrow(
    "Organization membership and roles are managed through Better Auth",
  );
  expect(
    w.state.workspaceMembers.data.members.some(
      (member) => member.id === "member",
    ),
  ).toBe(true);
  expect(w.removeUserWorkspace).not.toHaveBeenCalled();

  await expect(w.service.execute(command("unknown", {}))).rejects.toThrow(
    "Unknown mutation: unknown",
  );
});

test("workspace permission calculation errors fail before the legacy acknowledged-operation catch", async () => {
  const w = workspace();

  await w.lifecycle.createWorkspace("owner");
  await expect(
    w.service.execute(command("createTeam", null)),
  ).rejects.toThrow();
});

test("workspace deletion clears and persists local state without calling another object", async () => {
  const w = workspace();

  await w.lifecycle.createWorkspace("owner");
  w.removeUserWorkspace.mockResolvedValueOnce({ ok: false });
  expect(await w.lifecycle.deleteWorkspace()).toBe(true);
  expect(w.state.workspaceMembers.data.members).toEqual([]);
  expect(w.state.workspaceStructure.data.teams).toEqual([]);
  expect(w.state.versions.get("globalVersion")).toBe(0);
});

test("presence rejects outsiders and persists member connect/disconnect", async () => {
  const w = workspace();

  await w.lifecycle.createWorkspace("owner");
  w.store.put.mockClear();
  expect(await w.lifecycle.setPresence("outsider", true)).toBe(false);
  expect(w.store.put).not.toHaveBeenCalled();
  expect(await w.lifecycle.setPresence("owner", true)).toBe(true);
  expect(w.state.presenceMap.has("owner")).toBe(true);

  await w.lifecycle.setPresence("owner", false);
  expect(w.state.presenceMap.has("owner")).toBe(false);
});

test("room service gates send/vote capabilities while preserving author checks", async () => {
  const {
    state,
    storage: store,
    service,
    records: recordRepository,
  } = roomServiceFixture();
  const message = MessageSchema.parse({
    id: "message",
    sender: "owner",
    content: "Hello",
    date: new Date().toISOString(),
  });

  await expect(
    dispatchRoomMutation(
      service,
      {
        mutation: {
          name: "sendMessage",
          id: 1,
          clientID: "client",
          args: message,
        },
        nextVersion: 1,
        userId: actor.userId,
      },
      { ...actor, isOwner: false },
    ),
  ).rejects.toThrow("Resource cannot be edited");
  expect(state.messages.data).toEqual([]);

  await service.sendMessage(message, actor);
  expect(store.put).not.toHaveBeenCalled();

  await expect(
    service.editMessage(
      { message, newContent: "Wrong" },
      { ...actor, userId: "outsider" },
    ),
  ).rejects.toThrow();
  expect(state.messages.data[0]?.content).toBe("Hello");

  await service.deleteMessage(message, actor);
  expect(state.messages.data).toEqual([]);
  expect((await recordRepository.loadRoom()).messages).toEqual(state.messages);
});

test("discussion service gates announcements and preserves author/privilege checks", async () => {
  const {
    state,
    storage: store,
    service,
    records: recordRepository,
  } = discussionServiceFixture();
  const post = ThreadPostSchema.parse({
    id: "post",
    author: "owner",
    content: "Announcement",
    type: "post",
    createdAt: new Date().toISOString(),
  });

  await service.createPost(post, {
    ...actor,
    isOwner: false,
  });
  expect(state.threadPosts.data).toEqual([]);

  await service.createPost(post, actor);
  await expect(
    service.togglePost(post.id, {
      ...actor,
      userId: "outsider",
      isOwner: false,
    }),
  ).rejects.toThrow();
  await service.togglePost(post.id, actor);
  expect(state.threadPosts.data[0]?.isResolved).toBe(true);

  await service.deletePost(post, actor);
  expect(state.threadPosts.data).toEqual([]);
  expect((await recordRepository.loadThread()).threadPosts).toEqual(
    state.threadPosts,
  );
});

test("user membership persistence is independent of object notifications", async () => {
  const { service, storage: store, state } = userServiceFixture();
  await service.addWorkspace("first");
  await service.addWorkspace("second");
  expect(await service.listWorkspaceIds()).toEqual(["first", "second"]);
  const execute = vi.mocked(store.sql.exec).getMockImplementation()!;
  vi.mocked(store.sql.exec).mockImplementation((query, ...bindings) => {
    if (/^delete from "user_workspaces"/i.test(query))
      throw new Error("disk full");
    return execute(query, ...bindings);
  });
  await expect(service.removeWorkspace("first")).rejects.toThrow("disk full");
  expect([...state.workspacesStore]).toEqual(["first", "second"]);
  expect(store.put).not.toHaveBeenCalled();
});

function objects() {
  return {
    putObject: vi.fn(
      async (_input: Parameters<ObjectStorage["putObject"]>[0]) => ({
        $metadata: {},
      }),
    ),
    listObjects: vi.fn(),
    headUrl: vi.fn(async (..._args: any[]) => "http://parties/head"),
    downloadUrl: vi.fn(async (..._args: any[]) => "http://parties/download"),
    deleteUrl: vi.fn(async () => "http://parties/delete"),
    createBucket: vi.fn(),
  };
}
function fileHandlers(missing = false) {
  const w = workspace(),
    provider = objects();
  const policy = new WorkspaceFiles("workspace", {
    saveChange: async () => {
      await w.store.put("changed", true);
    },
  });
  const handler = new WorkspaceFilesHandlers(
    policy,
    provider as never,
    {
      request: vi.fn(
        async () => new Response(null, { status: missing ? 404 : 200 }),
      ),
    },
    { notify: w.poke } as never,
  );
  const app = new Hono<WorkspaceContext>();
  app.onError(handleError);
  app.post("/upload/:teamId/:channelId/:path", handler.uploadFile);
  app.get("/download/:teamId/:path", handler.downloadFile);
  app.delete("/delete/:teamId/:path", (c) => handler.deleteFile(c, "file"));
  return { w, provider, app };
}

test("file handlers preserve private keys, URL expiry and notifications after persistence", async () => {
  const f = fileHandlers();
  const body = new FormData();
  body.set("file", new File(["body"], "sample.txt", { type: "text/plain" }));
  expect(
    (
      await f.app.request(`/upload/team/channel/${btoa("sample.txt")}`, {
        method: "POST",
        body,
      })
    ).status,
  ).toBe(200);
  expect(f.provider.putObject.mock.calls[0]?.[0]).toMatchObject({
    Key: "private_team/channel/sample.txt",
    ContentType: "text/plain",
  });
  expect(f.w.poke).toHaveBeenCalledWith({ type: "team-files", teamId: "team" });
  expect(
    (await f.app.request(`/download/team/${btoa("sample.txt")}?redirect=1`))
      .status,
  ).toBe(302);
  expect(f.provider.downloadUrl).toHaveBeenCalledWith(
    expect.objectContaining({
      Key: "team/sample.txt",
      ResponseContentDisposition: "attachment",
    }),
    604800,
  );
});

test("missing file deletion does not advance local versions or notify", async () => {
  const f = fileHandlers(true);
  expect(
    (await f.app.request(`/delete/team/${btoa("file")}`, { method: "DELETE" }))
      .status,
  ).toBe(200);
  expect(f.w.store.put).not.toHaveBeenCalled();
  expect(f.w.poke).not.toHaveBeenCalled();
});

test("invalid encoded paths fail validation before provider I/O", async () => {
  const f = fileHandlers();
  expect((await f.app.request("/download/team/!!!")).status).toBe(400);
  expect(
    (await f.app.request(`/download/team/${btoa("../secret")}`)).status,
  ).toBe(400);
  expect(f.provider.headUrl).not.toHaveBeenCalled();
});

function billing() {
  const payments = {
    listPrices: vi.fn(async () => ({ data: [{ id: "price" }] })),
    createCheckout: vi.fn(async () => ({ url: "https://payments/checkout" })),
    createPortal: vi.fn(async () => ({ url: "https://payments/portal" })),
    subscription: vi.fn(async (_id: string) => ({
      id: "subscription",
      created: 1,
      status: "active",
      metadata: { workspaceId: "workspace" },
      customer: "customer",
    })),
    verifyEvent: vi.fn<[], Promise<PaymentEvent>>(async () => ({
      type: "ignored",
    })),
  };
  const current = {
    id: "workspace",
    slug: "slug",
    isPremium: false,
    customerId: null as string | null,
  };
  const workspace = {
    getWorkspaceById: vi.fn(async () => current),
    setBilling: vi.fn(
      async (
        _id: string,
        _changes: { isPremium: boolean; customerId: string | null },
      ) => {},
    ),
  };
  const isAdmin = vi.fn(async () => true),
    poke = vi.fn(async () => {});
  let subscription:
    | import("@wodge/domain/billing/dto").SubscriptionState
    | undefined;
  const subscriptions = {
    get: vi.fn(async () => subscription),
    commit: vi.fn(
      async (event: import("@wodge/domain/billing/dto").SubscriptionState) => {
        subscription = event;
        await workspace.setBilling(event.workspaceId, {
          isPremium: event.isPremium,
          customerId: event.isPremium ? event.customerId : null,
        });
        return true;
      },
    ),
  };
  const service = new BillingService(workspace as never, subscriptions);
  const handlers = new BillingHandlers(
    service,
    payments as never,
    { isAdmin } as never,
    { notify: poke } as never,
  );
  const app = new Hono<ApiContext>();
  app.onError(handleError);
  app.use("*", async (c, next) => {
    c.set("user", { id: "owner", email: "owner@example.test" } as never);
    await next();
  });
  app.get("/:workspaceId/checkout", handlers.checkout);
  app.get("/:workspaceId/portal", handlers.portal);
  app.post("/webhook", handlers.webhook);
  const environment = createTestEnvironment({
    APP_DOMAIN: "https://wodge.test",
    STRIPE_LOOKUP_KEY: "premium",
  });
  return {
    service,
    payments,
    workspace,
    isAdmin,
    poke,
    current,
    request: (path: string) => app.request(path, {}, environment as never),
    webhook: () =>
      app.request(
        "/webhook",
        {
          method: "POST",
          headers: { "stripe-signature": "verified-fixture" },
          body: "{}",
        },
        environment as never,
      ),
  };
}

test("billing handler authorizes before querying or calling the provider", async () => {
  const b = billing();
  b.isAdmin.mockResolvedValueOnce(false);
  expect((await b.request("/workspace/checkout")).status).toBe(403);
  expect(b.workspace.getWorkspaceById).not.toHaveBeenCalled();
  expect(await (await b.request("/workspace/checkout")).json()).toEqual({
    url: "https://payments/checkout",
  });
  expect(b.payments.createCheckout).toHaveBeenCalledWith(
    expect.objectContaining({
      success_url: "https://wodge.test/slug/billing/success",
      cancel_url: "https://wodge.test/slug/billing/failure",
      subscription_data: { metadata: { workspaceId: "workspace" } },
      customer_email: "owner@example.test",
    }),
  );
  b.current.isPremium = true;
  expect((await b.request("/workspace/checkout")).status).toBe(400);
  expect((await b.request("/workspace/portal")).status).toBe(400);
  b.current.customerId = "customer";
  expect(await (await b.request("/workspace/portal")).json()).toEqual({
    url: "https://payments/portal",
  });
});

test("verified billing events persist before notifications and reject missing metadata", async () => {
  const b = billing();
  const event = (
    type: string,
    metadata: Record<string, string>,
    customer = "customer",
  ) =>
    ({
      id: type,
      created: type === "customer.subscription.deleted" ? 200 : 100,
      type,
      data: {
        object: {
          id: "subscription",
          created: 1,
          status: "active",
          metadata,
          customer,
        },
      },
    }) as PaymentEvent;
  b.payments.verifyEvent.mockResolvedValue(
    event("customer.subscription.created", {}),
  );
  expect((await b.webhook()).status).toBe(400);
  expect(b.poke).not.toHaveBeenCalled();
  b.payments.verifyEvent.mockResolvedValue(
    event("customer.subscription.created", { workspaceId: "workspace" }),
  );
  expect((await b.webhook()).status).toBe(200);
  expect(b.workspace.setBilling).toHaveBeenCalledWith("workspace", {
    isPremium: true,
    customerId: "customer",
  });
  b.payments.subscription.mockResolvedValueOnce({
    id: "subscription",
    created: 1,
    status: "canceled",
    metadata: { workspaceId: "workspace" },
    customer: "customer",
  });
  b.payments.verifyEvent.mockResolvedValue(
    event("customer.subscription.deleted", { workspaceId: "workspace" }),
  );
  expect((await b.webhook()).status).toBe(200);
  expect(b.workspace.setBilling).toHaveBeenCalledWith("workspace", {
    isPremium: false,
    customerId: null,
  });
  expect(b.poke).toHaveBeenCalledTimes(2);
  b.payments.verifyEvent.mockResolvedValue({ type: "ignored" });
  await b.webhook();
  expect(b.poke).toHaveBeenCalledTimes(2);
});

test("workspace directory validates admission without performing identity writes", async () => {
  const { WorkspaceDirectory } =
    await import("@wodge/core/workspace/services/directory");
  const invite = { workspaceId: "workspace", token: "invite" };
  const repository = {
    getWorkspaceById: async () => ({
      isInviteLinkEnabled: true,
      isPremium: false,
    }),
    getInvite: async () => invite,
    countMembers: async () => 1,
    getMembership: async () => undefined,
  };
  const directory = new WorkspaceDirectory(repository as never, {
    getUserInfoById: async () => [],
  });
  expect(await directory.validateJoin("member", "workspace", "invite")).toBe(
    invite,
  );
});

test("organization synchronization is idempotent and preserves resources while refreshing membership projections", async () => {
  const w = workspace();
  await w.lifecycle.synchronizeMembers([
    { userId: "owner", role: "owner" },
    { userId: "member", role: "member" },
  ]);
  const originalTeamId = w.state.workspaceStructure.data.teams[0]!.id;
  const originalRoomId = w.state.workspaceStructure.data.teams[0]!.rooms[0]!.id;
  const firstRevision = w.state.versions.get("globalVersion")!;
  await w.lifecycle.synchronizeMembers([
    { userId: "owner", role: "owner" },
    { userId: "member", role: "admin" },
  ]);
  expect(
    w.state.workspaceMembers.data.members.find(
      (member) => member.id === "member",
    )?.role,
  ).toBe("admin");
  expect(w.state.workspaceStructure.data.teams[0]!.id).toBe(originalTeamId);
  expect(w.state.workspaceStructure.data.teams[0]!.rooms[0]!.id).toBe(
    originalRoomId,
  );
  expect(w.createBucket).not.toHaveBeenCalled();
  expect(w.state.workspaceStructure.lastModifiedVersion).toBeGreaterThan(
    firstRevision,
  );
  w.state.workspaceStructure = {
    ...w.state.workspaceStructure,
    data: {
      ...w.state.workspaceStructure.data,
      teams: w.state.workspaceStructure.data.teams.map((team) => ({
        ...team,
        moderators: ["member"],
      })),
    },
  };
  w.state.presenceMap.set("member", true);
  await w.lifecycle.synchronizeMembers([{ userId: "owner", role: "owner" }]);
  expect(w.state.workspaceStructure.data.teams[0]!.members).toEqual(["owner"]);
  expect(w.state.workspaceStructure.data.teams[0]!.moderators).toEqual([]);
  expect(w.state.presenceMap.has("member")).toBe(false);
  expect(w.removeUserWorkspace).not.toHaveBeenCalled();
  expect(
    (
      await new WorkspaceRecordRepository(
        w.state.ctx.storage,
        createObjectDatabase(w.state.ctx.storage),
        new ObjectSyncRepository(
          w.state.ctx.storage,
          createObjectDatabase(w.state.ctx.storage),
          "workspace",
        ),
      ).loadWorkspace()
    ).workspaceStructure,
  ).toEqual(w.state.workspaceStructure);
});

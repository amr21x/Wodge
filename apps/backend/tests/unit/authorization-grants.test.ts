import { ObjectSyncRepository } from "@wodge/core/sync/repositories/state";
import { createObjectDatabase } from "@wodge/infra/database/object-database";
import { attachSql } from "../helpers/sqlite";
import { ResourceGrantCache } from "@wodge/auth/authorization/grants";
import { AuthorizationPolicies } from "@wodge/auth/authorization/policies";
import { RoomScope } from "@wodge/auth/authorization/room-scope";
import { RoomRecordRepository } from "@wodge/core/rooms/repositories/records";
import type { ResourceGrant } from "@wodge/domain/authorization/models";
import { afterEach, expect, test, vi } from "vitest";

const principal = { userId: "alice", sessionId: "session" };
const scope = { workspaceId: "workspace", teamId: "team", roomId: "room" };

function fixture() {
  const record = new Map<string, unknown>();
  const storage = attachSql({
    async get(key: string) {
      return structuredClone(record.get(key));
    },
    async put(key: string, value: unknown) {
      record.set(key, structuredClone(value));
    },
  } as unknown as DurableObjectStorage);
  const persistence = new RoomRecordRepository(
    storage,
    createObjectDatabase(storage),
    new ObjectSyncRepository(storage, createObjectDatabase(storage), "room"),
  );
  const gateway = {
    resolve: vi.fn(async (_scope, subject): Promise<ResourceGrant> => {
      const issuedAt = Date.now();
      return {
        principal: subject,
        workspaceId: "workspace",
        scope: { type: "room", id: "room" },
        permissions: { room: ["read"], message: ["send"] },
        issuedAt,
        expiresAt: issuedAt + 30_000,
        policyRevision: 1,
      };
    }),
  };
  return {
    gateway,
    persistence,
    cache: new ResourceGrantCache(gateway, new RoomScope(persistence), "room"),
  };
}

afterEach(() => {
  vi.useRealTimers();
});

test("resource grants coalesce refreshes and isolate users/sessions", async () => {
  const { cache, gateway } = fixture();
  await cache.bind(scope);
  const [first, second] = await Promise.all([
    cache.get(principal),
    cache.get(principal),
  ]);
  expect(first).toEqual(second);
  expect(gateway.resolve).toHaveBeenCalledTimes(1);
  await cache.get(principal);
  expect(gateway.resolve).toHaveBeenCalledTimes(1);
  await cache.get({ ...principal, sessionId: "other-session" });
  expect(gateway.resolve).toHaveBeenCalledTimes(2);
});

test("expired grants refresh and a failed renewal cannot reuse old permissions", async () => {
  vi.useFakeTimers();
  const { cache, gateway } = fixture();
  await cache.bind(scope);
  await cache.get(principal);
  vi.advanceTimersByTime(30_001);
  gateway.resolve.mockRejectedValue(new Error("workspace unavailable"));
  await expect(cache.get(principal)).rejects.toThrow("workspace unavailable");
});

test("new revisions invalidate grants and an in-flight stale result is rejected", async () => {
  const { cache, gateway } = fixture();
  await cache.bind(scope);
  const first = await cache.get(principal);
  let release!: (value: ResourceGrant) => void;
  gateway.resolve.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        release = resolve;
      }),
  );
  const refreshing = cache.get({ ...principal, sessionId: "other-session" });
  await vi.waitFor(() => expect(release).toBeTypeOf("function"));
  await cache.invalidate("workspace", 2);
  release({
    ...first,
    principal: { ...principal, sessionId: "other-session" },
  });
  await expect(refreshing).rejects.toMatchObject({
    code: "AUTHORIZATION_UNAVAILABLE",
  });
  gateway.resolve.mockResolvedValue({ ...first, policyRevision: 2 });
  expect((await cache.get(principal)).policyRevision).toBe(2);
  await cache.invalidate("workspace", 1);
  expect((await cache.get(principal)).policyRevision).toBe(2);
});

test("scope binding survives reconstruction and cannot be reassigned", async () => {
  const { cache, persistence, gateway } = fixture();
  await cache.bind(scope);
  await expect(
    cache.bind({ ...scope, workspaceId: "foreign" }),
  ).rejects.toMatchObject({ code: "AUTHORIZATION_CONFLICT" });
  const restarted = new ResourceGrantCache(
    gateway,
    new RoomScope(persistence),
    "room",
  );
  expect((await restarted.get(principal)).workspaceId).toBe("workspace");
  await expect(cache.invalidate("foreign", 100)).rejects.toMatchObject({
    code: "AUTHORIZATION_FORBIDDEN",
  });
});

test("a grant cannot be used for a different room or with an extended lease", async () => {
  const { cache, gateway } = fixture();
  await cache.bind(scope);
  const correct = await gateway.resolve(scope, principal);
  gateway.resolve.mockResolvedValue({
    ...correct,
    scope: { type: "room", id: "other" },
  });
  await expect(cache.get(principal)).rejects.toMatchObject({
    code: "AUTHORIZATION_UNAVAILABLE",
  });
  gateway.resolve.mockResolvedValue({
    ...correct,
    expiresAt: correct.issuedAt + 60_000,
  });
  await expect(cache.get(principal)).rejects.toMatchObject({
    code: "AUTHORIZATION_UNAVAILABLE",
  });
});

test("an unbound room with existing records cannot be claimed by a workspace", async () => {
  const records = new Map<string, unknown>([
    ["messages", { data: [{ id: "private-message" }] }],
  ]);
  const storage = attachSql({
    async get(key: string) {
      return records.get(key);
    },
    async put(key: string, value: unknown) {
      records.set(key, value);
    },
  } as unknown as DurableObjectStorage);
  const persistence = new RoomRecordRepository(
    storage,
    createObjectDatabase(storage),
    new ObjectSyncRepository(storage, createObjectDatabase(storage), "room"),
  );
  await expect(
    new RoomScope(persistence).bindRoomScope(scope),
  ).rejects.toMatchObject({
    code: "AUTHORIZATION_CONFLICT",
  });
  expect(records.has("authorization:room-scope:v1")).toBe(false);
});

test("failed invalidation remains durable and is acknowledged only after delivery succeeds", async () => {
  const { AuthorizationRepository } =
    await import("@wodge/core/authorization/repositories/policy");
  const { AuthorizationInvalidations } =
    await import("../../src/lib/authorization/invalidation");
  const records = new Map<string, unknown>();
  const query = new AuthorizationRepository(
    {
      async get(key: string) {
        return structuredClone(records.get(key));
      },
      async put(key: string, value: unknown) {
        records.set(key, structuredClone(value));
      },
    } as unknown as DurableObjectStorage,
    "workspace",
    createObjectDatabase(
      attachSql({
        async get(key: string) {
          return structuredClone(records.get(key));
        },
        async put(key: string, value: unknown) {
          records.set(key, structuredClone(value));
        },
      } as unknown as DurableObjectStorage),
    ),
  );
  const repository = new AuthorizationPolicies(query);
  await repository.commit(0, {
    schemaVersion: 1,
    workspaceId: "workspace",
    revision: 1,
    roles: [],
    assignments: [],
  });
  const gateway = {
    invalidateAuthorization: vi
      .fn()
      .mockRejectedValue(new Error("room unavailable")),
  };
  const schedule = vi.fn(async () => {});
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  const delivery = new AuthorizationInvalidations(
    repository,
    gateway,
    {
      schedule,
    },
    { roomScopes: () => [{ roomId: "room", teamId: "team" }] },
  );
  try {
    await delivery.flush();
    expect(await repository.pendingInvalidations()).toHaveLength(1);
    expect(schedule).toHaveBeenCalledOnce();
    gateway.invalidateAuthorization.mockResolvedValue(undefined);
    await delivery.flush();
    expect(await repository.pendingInvalidations()).toEqual([]);
    expect((await repository.read())!.revision).toBe(1);
    await delivery.flush();
    expect(gateway.invalidateAuthorization).toHaveBeenCalledTimes(2);
  } finally {
    log.mockRestore();
  }
});

import { DiscussionRecordRepository } from "@wodge/core/discussions/repositories/records";
import { PageRecordRepository } from "@wodge/core/pages/repositories/records";
import { RoomRepository } from "@wodge/core/rooms/repositories/messages";
import { RoomRecordRepository } from "@wodge/core/rooms/repositories/records";
import { UserRecordRepository } from "@wodge/core/user/repositories/records";
import { WorkspaceFileRepository } from "@wodge/core/workspace/repositories/files";
import { WorkspaceLifecycleRepository } from "@wodge/core/workspace/repositories/lifecycle";
import { WorkspaceRecordRepository } from "@wodge/core/workspace/repositories/records";
import {
  REPLICACHE_VERSIONS_KEY,
  WORKSPACE_PRESENCE_KEY,
  makeWorkspaceMembersKey,
  makeWorkspaceStructureKey,
} from "@wodge/domain/sync/index";
import { describe, expect, test } from "vitest";

function fixture() {
  const records = new Map<string, unknown>();
  const storage = {
    async get(key: string | string[]) {
      if (Array.isArray(key)) {
        return new Map(
          key
            .filter((item) => records.has(item))
            .map((item) => [item, structuredClone(records.get(item))]),
        );
      }

      return structuredClone(records.get(key));
    },
    async put(key: string | Record<string, unknown>, value?: unknown) {
      const entries =
        typeof key === "string" ? [[key, value] as const] : Object.entries(key);

      for (const [name, data] of entries) {
        records.set(name, structuredClone(data));
      }
    },
  } as Pick<DurableObjectStorage, "get" | "put">;

  return {
    records,
    storage,
    persistence: new RoomRecordRepository(storage),
  };
}

describe("Durable Object persistence without a server", () => {
  test("cold objects receive independent default state", async () => {
    const { persistence, storage } = fixture();
    const room = await persistence.loadRoom();
    const other = await persistence.loadRoom();

    room.messages.data.push({ id: "local" } as never);
    room.versions.set("globalVersion", 3);

    expect(other.messages.data).toEqual([]);
    expect(other.versions.get("globalVersion")).toBe(0);
    expect(
      (await new DiscussionRecordRepository(storage).loadThread()).threadPosts
        .data,
    ).toEqual([]);
    expect(
      (await new PageRecordRepository(storage).loadPage()).state.record.data,
    ).toEqual({
      columns: [],
      tasks: [],
    });
    expect(
      (await new UserRecordRepository(storage).loadUser()).workspacesStore,
    ).toEqual(new Set());
  });

  test("room records and page snapshots survive a new persistence instance", async () => {
    const { storage, persistence, records } = fixture();
    const state = await persistence.loadRoom();
    const repository = new RoomRepository(storage, state);

    await repository.save([], 7);
    await new PageRecordRepository(storage).savePageSnapshot(
      new Uint8Array([1, 2, 3]),
    );

    const restarted = new RoomRecordRepository(storage);

    expect((await restarted.loadRoom()).messages.lastModifiedVersion).toBe(7);
    expect(await new PageRecordRepository(storage).loadPageSnapshot()).toEqual(
      new Uint8Array([1, 2, 3]),
    );
    expect(records.has("messages")).toBe(true);
  });

  test("workspace lifecycle and file revisions persist the shared state", async () => {
    const { storage, records } = fixture();
    const state = await new WorkspaceRecordRepository(storage).loadWorkspace();
    const lifecycle = new WorkspaceLifecycleRepository(storage, state);

    lifecycle.presence.set("member", true);
    await lifecycle.saveCreatedWorkspace();

    expect(records.get(makeWorkspaceMembersKey())).toMatchObject({
      lastModifiedVersion: 1,
    });
    expect(records.get(makeWorkspaceStructureKey())).toMatchObject({
      lastModifiedVersion: 1,
    });
    expect(records.get(WORKSPACE_PRESENCE_KEY)).toEqual(
      new Map([["member", true]]),
    );

    const files = new WorkspaceFileRepository(storage, state);

    await files.saveChange();

    expect(records.get(REPLICACHE_VERSIONS_KEY)).toEqual(
      new Map([
        ["globalVersion", 2],
        ["workspaceInfo", 2],
      ]),
    );
    expect(
      (
        await new WorkspaceRecordRepository(storage).loadWorkspace()
      ).versions.get("globalVersion"),
    ).toBe(2);
  });
});

import { PollRepository } from "@wodge/core/polls/repositories/polls";
import { ObjectSyncRepository } from "@wodge/core/sync/repositories/state";
import workspaceMigrations from "../../../../packages/infra/database/objects/workspace/bundle.json";
import { legacyPermissionImports } from "@wodge/core/workspace/legacy-permissions";
import * as Y from "yjs";
import { PageDocumentRepository } from "@wodge/core/pages/repositories/document";
import { createObjectDatabase } from "@wodge/infra/database/object-database";
import { prepareObjectDatabase } from "@wodge/infra/database/object-migrations";
import { DiscussionRecordRepository } from "@wodge/core/discussions/repositories/records";
import { PageRecordRepository } from "@wodge/core/pages/repositories/records";
import { RoomRepository } from "@wodge/core/rooms/repositories/messages";
import { RoomRecordRepository } from "@wodge/core/rooms/repositories/records";
import { UserRecordRepository } from "@wodge/core/user/repositories/records";
import { WorkspaceFileRepository } from "@wodge/core/workspace/repositories/files";
import { WorkspaceLifecycleRepository } from "@wodge/core/workspace/repositories/lifecycle";
import { WorkspaceRecordRepository } from "@wodge/core/workspace/repositories/records";
import { createDefaultTeam } from "@wodge/core/workspace/defaults";
import { MessageSchema } from "@wodge/domain/rooms/validation";
import { ThreadPostSchema } from "@wodge/domain/discussions/validation";
import { TaskSchema } from "@wodge/domain/pages/validation";
import {
  REPLICACHE_VERSIONS_KEY,
  makeWorkspaceStructureKey,
  makeWorkspacesStoreKey,
} from "@wodge/domain/sync/index";
import { describe, expect, test, vi } from "vitest";
import { attachSql } from "../helpers/sqlite";

function fixture() {
  const records = new Map<string, unknown>();
  const storage = attachSql({
    get: vi.fn(async (key: string | string[]) =>
      Array.isArray(key)
        ? new Map(
            key
              .filter((item) => records.has(item))
              .map((item) => [item, structuredClone(records.get(item))]),
          )
        : structuredClone(records.get(key)),
    ),
    put: vi.fn(
      async (key: string | Record<string, unknown>, value?: unknown) => {
        for (const [name, data] of typeof key === "string"
          ? [[key, value]]
          : Object.entries(key))
          records.set(name as string, structuredClone(data));
      },
    ),
  }) as unknown as DurableObjectStorage;
  return { records, storage };
}
const record = <T>(data: T, lastModifiedVersion = 7) => ({
  data,
  lastModifiedVersion,
  deleted: false,
});

describe("relational object persistence", () => {
  test("sync versions and acknowledgements import once and survive reconstruction without KV", async () => {
    const { storage, records } = fixture();
    const groupKey = "clientGroup/group";
    const clientKey = groupKey + "/client/client";
    records.set(REPLICACHE_VERSIONS_KEY, new Map([["globalVersion", 3]]));
    storage.list = vi.fn(
      async () =>
        new Map([
          [groupKey, { id: groupKey, userID: "owner" }],
          [
            clientKey,
            {
              id: "client",
              clientGroupID: groupKey,
              lastMutationID: 2,
              lastModifiedVersion: 3,
            },
          ],
        ]),
    ) as DurableObjectStorage["list"];
    const sync = new ObjectSyncRepository(
      storage,
      createObjectDatabase(storage),
      "page",
    );
    expect((await sync.client(clientKey))?.lastMutationID).toBe(2);
    await sync.acknowledge(
      new Map([["globalVersion", 4]]),
      new Map([
        [
          clientKey,
          {
            id: "client",
            clientGroupID: groupKey,
            lastMutationID: 3,
            lastModifiedVersion: 4,
          },
        ],
      ]),
    );
    vi.mocked(storage.get).mockRejectedValue(
      new Error("Unexpected legacy read"),
    );
    vi.mocked(storage.list).mockRejectedValue(
      new Error("Unexpected legacy list"),
    );
    vi.mocked(storage.put).mockRejectedValue(new Error("Unexpected KV write"));
    const restored = new ObjectSyncRepository(
      storage,
      createObjectDatabase(storage),
      "page",
    );
    expect((await restored.loadVersions()).get("globalVersion")).toBe(4);
    expect((await restored.client(clientKey))?.lastMutationID).toBe(3);
    expect((await restored.group(groupKey))?.userID).toBe("owner");
    expect(await restored.changedClients(groupKey, 3)).toHaveLength(1);
    expect(records.get(REPLICACHE_VERSIONS_KEY)).toEqual(
      new Map([["globalVersion", 3]]),
    );
    expect(storage.put).not.toHaveBeenCalled();
  });

  test("Drizzle migrations adopt existing tables, upgrade repeatably and reject newer schemas", async () => {
    const { storage } = fixture();
    await prepareObjectDatabase(createObjectDatabase(storage), "page");
    storage.sql.exec(
      "INSERT INTO page_columns (id, position, title) VALUES ('retained', 0, 'Retained')",
    );
    storage.sql.exec("DROP TABLE page_document_updates");
    storage.sql.exec("DROP TABLE page_document");
    for (const table of [
      "sync_clients",
      "sync_client_groups",
      "sync_import",
      "sync_versions",
    ])
      storage.sql.exec(`DROP TABLE ${table}`);
    storage.sql.exec("DROP TABLE __drizzle_migrations");
    storage.sql.exec(
      "CREATE TABLE object_schema_migrations (scope TEXT, version INTEGER)",
    );
    storage.sql.exec("INSERT INTO object_schema_migrations VALUES ('page', 1)");
    await prepareObjectDatabase(createObjectDatabase(storage), "page");
    await prepareObjectDatabase(createObjectDatabase(storage), "page");
    expect(storage.sql.exec("SELECT id FROM page_columns").toArray()).toEqual([
      { id: "retained" },
    ]);
    expect(
      storage.sql.exec("SELECT * FROM __drizzle_migrations").toArray(),
    ).toHaveLength(4);
    storage.sql.exec(
      "UPDATE __drizzle_migrations SET created_at = 9999999999999",
    );
    await expect(
      prepareObjectDatabase(createObjectDatabase(storage), "page"),
    ).rejects.toThrow("Unsupported");
  });

  test("a failed legacy import stays retryable and cannot leave half-imported entities", async () => {
    const { storage, records } = fixture();
    const task = TaskSchema.parse({ id: "task", columnId: "missing" });
    records.set(
      "db",
      record({
        columns: [{ id: "duplicate" }, { id: "duplicate" }],
        tasks: [task],
      }),
    );
    await expect(
      new PageRecordRepository(
        storage,
        createObjectDatabase(storage),
        new ObjectSyncRepository(
          storage,
          createObjectDatabase(storage),
          "page",
        ),
      ).loadPage(),
    ).rejects.toThrow();
    expect(storage.sql.exec("SELECT * FROM record_metadata").toArray()).toEqual(
      [],
    );
    records.set("db", record({ columns: [{ id: "missing" }], tasks: [task] }));
    expect(
      (
        await new PageRecordRepository(
          storage,
          createObjectDatabase(storage),
          new ObjectSyncRepository(
            storage,
            createObjectDatabase(storage),
            "page",
          ),
        ).loadPage()
      ).state.record.data.tasks,
    ).toEqual([task]);
  });
  test("cold objects get independent defaults and schema versions survive reconstruction", async () => {
    const { storage } = fixture();
    const room = await new RoomRecordRepository(
      storage,
      createObjectDatabase(storage),
      new ObjectSyncRepository(storage, createObjectDatabase(storage), "room"),
    ).loadRoom();
    room.versions.set("globalVersion", 3);
    expect(
      (
        await new RoomRecordRepository(
          storage,
          createObjectDatabase(storage),
          new ObjectSyncRepository(
            storage,
            createObjectDatabase(storage),
            "room",
          ),
        ).loadRoom()
      ).versions.get("globalVersion"),
    ).toBe(0);
    expect(
      storage.sql.exec("SELECT created_at FROM __drizzle_migrations").toArray(),
    ).toHaveLength(4);
    const pageStorage = fixture().storage;
    const threadStorage = fixture().storage;
    const userStorage = fixture().storage;
    expect(
      (
        await new PageRecordRepository(
          pageStorage,
          createObjectDatabase(pageStorage),
          new ObjectSyncRepository(
            pageStorage,
            createObjectDatabase(pageStorage),
            "page",
          ),
        ).loadPage()
      ).state.record.data,
    ).toEqual({ columns: [], tasks: [] });
    expect(
      (
        await new DiscussionRecordRepository(
          threadStorage,
          createObjectDatabase(threadStorage),
          new ObjectSyncRepository(
            threadStorage,
            createObjectDatabase(threadStorage),
            "thread",
          ),
        ).loadThread()
      ).threadPosts.data,
    ).toEqual([]);
    expect(
      (
        await new UserRecordRepository(
          userStorage,
          createObjectDatabase(userStorage),
          new ObjectSyncRepository(
            userStorage,
            createObjectDatabase(userStorage),
            "user",
          ),
        ).loadUser()
      ).workspacesStore,
    ).toEqual(new Set());
  });

  test("room import preserves poll rows and ordering and never reimports stale KV", async () => {
    const { storage, records } = fixture();
    const message = MessageSchema.parse({
      id: "poll",
      sender: "owner",
      content: "Vote",
      type: "poll",
      date: new Date().toISOString(),
      pollOptions: ["A", "B"],
      votes: [0, 1],
      pollVoters: [{ voter: "member", option: 1 }],
    });
    records.set("messages", record([message]));
    records.set(REPLICACHE_VERSIONS_KEY, new Map([["globalVersion", 7]]));
    const repository = new RoomRecordRepository(
      storage,
      createObjectDatabase(storage),
      new ObjectSyncRepository(storage, createObjectDatabase(storage), "room"),
    );
    const state = await repository.loadRoom();
    expect(state.messages).toEqual(record([message]));
    expect(
      storage.sql.exec("SELECT voter, option FROM poll_voters").toArray(),
    ).toEqual([{ voter: "member", option: 1 }]);
    const messages = new RoomRepository(
      repository,
      state,
      createObjectDatabase(storage),
      new PollRepository(createObjectDatabase(storage)),
    );
    await messages.change(8, () => messages.delete(message.id));
    expect(storage.sql.exec("SELECT * FROM room_messages").toArray()).toEqual(
      [],
    );
    expect(storage.sql.exec("SELECT * FROM poll_voters").toArray()).toEqual([]);
    expect(
      (
        await new RoomRecordRepository(
          storage,
          createObjectDatabase(storage),
          new ObjectSyncRepository(
            storage,
            createObjectDatabase(storage),
            "room",
          ),
        ).loadRoom()
      ).messages,
    ).toEqual(record([], 8));
    expect(records.get("messages")).toEqual(record([message]));
  });

  test("thread comments and poll votes import into separate rows and survive edits/deletes", async () => {
    const { storage, records } = fixture();
    const post = ThreadPostSchema.parse({
      id: "post",
      author: "owner",
      content: "Question",
      type: "poll",
      createdAt: new Date().toISOString(),
      comments: [
        {
          id: "reply",
          author: "member",
          content: "Reply",
          type: "message",
          createdAt: new Date().toISOString(),
        },
      ],
      pollOptions: ["Yes", "No"],
      votes: [1, 0],
      pollVoters: [{ voter: "member", option: 0 }],
    });
    records.set("posts", record([post]));
    const repository = new DiscussionRecordRepository(
      storage,
      createObjectDatabase(storage),
      new ObjectSyncRepository(
        storage,
        createObjectDatabase(storage),
        "thread",
      ),
    );
    expect((await repository.loadThread()).threadPosts).toEqual(record([post]));
    expect(
      storage.sql
        .exec("SELECT post_id, content FROM thread_comments")
        .toArray(),
    ).toEqual([{ post_id: "post", content: "Reply" }]);
    await repository.savePosts(
      record([{ ...post, comments: [], content: "Edited" }], 8),
    );
    expect(
      (
        await new DiscussionRecordRepository(
          storage,
          createObjectDatabase(storage),
          new ObjectSyncRepository(
            storage,
            createObjectDatabase(storage),
            "thread",
          ),
        ).loadThread()
      ).threadPosts.data[0]?.content,
    ).toBe("Edited");
    expect(storage.sql.exec("SELECT * FROM thread_comments").toArray()).toEqual(
      [],
    );
  });

  test("page columns, tasks and assignees retain order and stay separate from Yjs snapshots", async () => {
    const { storage, records } = fixture();
    const data = {
      columns: [
        { id: "done", title: "Done" },
        { id: "todo", title: "Todo" },
      ],
      tasks: [
        TaskSchema.parse({
          id: "task",
          columnId: "todo",
          title: "Work",
          assignee: ["b", "a"],
          due: {},
          includeTime: true,
        }),
      ],
    };
    records.set("db", record(data));
    const repository = new PageRecordRepository(
      storage,
      createObjectDatabase(storage),
      new ObjectSyncRepository(storage, createObjectDatabase(storage), "page"),
    );
    await storage.put("yjs:snapshot", new Uint8Array([1, 2, 3]));
    expect((await repository.loadPage()).state.record).toEqual(record(data));
    expect(
      storage.sql
        .exec("SELECT user_id FROM page_task_assignees ORDER BY position")
        .toArray(),
    ).toEqual([{ user_id: "b" }, { user_id: "a" }]);
    await repository.savePage(
      record(
        { columns: [data.columns[1]!, data.columns[0]!], tasks: data.tasks },
        8,
      ),
    );
    const restarted = new PageRecordRepository(
      storage,
      createObjectDatabase(storage),
      new ObjectSyncRepository(storage, createObjectDatabase(storage), "page"),
    );
    expect(
      (await restarted.loadPage()).state.record.data.columns.map(
        (column) => column.id,
      ),
    ).toEqual(["todo", "done"]);
    expect(await storage.get("yjs:snapshot")).toEqual(
      new Uint8Array([1, 2, 3]),
    );
    await repository.savePage(record({ columns: [], tasks: [] }, 9));
    expect(
      storage.sql.exec("SELECT * FROM page_task_assignees").toArray(),
    ).toEqual([]);
  });

  test("workspace hierarchy, membership, presence and revisions persist in SQLite", async () => {
    const { storage, records } = fixture();
    const repository = new WorkspaceRecordRepository(
      storage,
      createObjectDatabase(storage),
      new ObjectSyncRepository(
        storage,
        createObjectDatabase(storage),
        "workspace",
      ),
    );
    const state = await repository.loadWorkspace();
    const team = createDefaultTeam("owner");
    state.workspaceStructure = record({ teams: [team] });
    await repository.saveStructure(state.workspaceStructure);
    const lifecycle = new WorkspaceLifecycleRepository(
      repository,
      new ObjectSyncRepository(
        storage,
        createObjectDatabase(storage),
        "workspace",
      ),
      state,
      createObjectDatabase(storage),
    );
    lifecycle.presence.set("member", true);
    await lifecycle.saveCreatedWorkspace();
    const restarted = await new WorkspaceRecordRepository(
      storage,
      createObjectDatabase(storage),
      new ObjectSyncRepository(
        storage,
        createObjectDatabase(storage),
        "workspace",
      ),
    ).loadWorkspace();
    expect(restarted.workspaceStructure).toEqual(state.workspaceStructure);
    expect(
      storage.sql
        .exec("SELECT id, kind FROM workspace_channels ORDER BY kind")
        .toArray()
        .map((row) => row.kind),
    ).toEqual(["page", "room", "thread"]);
    expect(records.has(makeWorkspaceStructureKey())).toBe(false);
    expect(restarted.presenceMap).toEqual(new Map([["member", true]]));
    await new WorkspaceFileRepository(
      new ObjectSyncRepository(
        storage,
        createObjectDatabase(storage),
        "workspace",
      ),
      state,
    ).saveChange();
    expect(
      (
        await new WorkspaceRecordRepository(
          storage,
          createObjectDatabase(storage),
          new ObjectSyncRepository(
            storage,
            createObjectDatabase(storage),
            "workspace",
          ),
        ).loadWorkspace()
      ).versions.get("globalVersion"),
    ).toBe(2);
    state.workspaceStructure.data = { teams: [] };
    await lifecycle.saveDeletedWorkspace();
    expect(
      (
        await new WorkspaceRecordRepository(
          storage,
          createObjectDatabase(storage),
          new ObjectSyncRepository(
            storage,
            createObjectDatabase(storage),
            "workspace",
          ),
        ).loadWorkspace()
      ).versions.get("globalVersion"),
    ).toBe(0);
    expect(
      storage.sql.exec("SELECT * FROM workspace_channels").toArray(),
    ).toEqual([]);
  });

  test("user workspace import is one-time, preserves insertion order and empty deletions", async () => {
    const { storage, records } = fixture();
    records.set(makeWorkspacesStoreKey(), new Set(["b", "a"]));
    const repository = new UserRecordRepository(
      storage,
      createObjectDatabase(storage),
      new ObjectSyncRepository(storage, createObjectDatabase(storage), "user"),
    );
    expect((await repository.loadUser()).workspacesStore).toEqual(
      new Set(["b", "a"]),
    );
    await repository.saveWorkspaces(new Set());
    expect(
      (
        await new UserRecordRepository(
          storage,
          createObjectDatabase(storage),
          new ObjectSyncRepository(
            storage,
            createObjectDatabase(storage),
            "user",
          ),
        ).loadUser()
      ).workspacesStore.size,
    ).toBe(0);
  });

  test("legacy orphan column references remain readable without inventing a new validation rule", async () => {
    const { storage, records } = fixture();
    const task = TaskSchema.parse({ id: "orphan", columnId: "removed" });
    records.set("db", record({ columns: [], tasks: [task] }));
    expect(
      (
        await new PageRecordRepository(
          storage,
          createObjectDatabase(storage),
          new ObjectSyncRepository(
            storage,
            createObjectDatabase(storage),
            "page",
          ),
        ).loadPage()
      ).state.record.data.tasks,
    ).toEqual([task]);
  });

  test("unchanged entities are not rewritten and duplicate keys roll back a local save", async () => {
    const { storage } = fixture();
    const repository = new PageRecordRepository(
      storage,
      createObjectDatabase(storage),
      new ObjectSyncRepository(storage, createObjectDatabase(storage), "page"),
    );
    const data = {
      columns: [{ id: "todo" }],
      tasks: [TaskSchema.parse({ id: "task", columnId: "todo" })],
    };
    await repository.savePage(record(data));
    vi.mocked(storage.sql.exec).mockClear();
    await repository.savePage(record(data, 8));
    expect(
      vi
        .mocked(storage.sql.exec)
        .mock.calls.filter(([sql]) =>
          sql.toLowerCase().includes('insert into "page_tasks"'),
        ),
    ).toHaveLength(0);
    await expect(
      repository.savePage(
        record({ ...data, tasks: [data.tasks[0]!, data.tasks[0]!] }, 9),
      ),
    ).rejects.toThrow();
    expect((await repository.loadPage()).state.record).toEqual(record(data, 8));
  });
});

describe("SQLite Yjs recovery", () => {
  test("imports legacy state once, replays updates after restart and compacts without keeping history", async () => {
    const { storage, records } = fixture();
    const live = new Y.Doc();
    live.getText("body").insert(0, "Legacy");
    records.set("yjs:snapshot", Y.encodeStateAsUpdate(live));
    const repository = new PageDocumentRepository(
      storage,
      createObjectDatabase(storage),
    );
    const initial = await repository.loadDocument();
    expect(initial.snapshot).toEqual(Y.encodeStateAsUpdate(live));
    live.on("update", (update) => repository.appendUpdates([update]));
    live.getText("body").insert(6, " live");
    records.set("yjs:snapshot", new Uint8Array([0]));
    const restart = new PageDocumentRepository(
      storage,
      createObjectDatabase(storage),
    );
    const saved = await restart.loadDocument();
    const restored = new Y.Doc();
    Y.applyUpdate(restored, saved.snapshot!);
    for (const update of saved.updates) Y.applyUpdate(restored, update);
    expect(restored.getText("body").toString()).toBe("Legacy live");
    expect(saved.sequence).toBe(1);
    const checkpoint = Y.encodeStateAsUpdate(restored);
    live.getText("body").insert(11, " newer");
    restart.compact(checkpoint, saved.sequence);
    const later = await restart.loadDocument();
    expect(later.updates).toHaveLength(1);
    Y.applyUpdate(restored, later.updates[0]!);
    expect(restored.getText("body").toString()).toBe("Legacy live newer");
    restart.compact(Y.encodeStateAsUpdate(restored), later.sequence);
    expect(
      storage.sql.exec("SELECT * FROM page_document_updates").toArray(),
    ).toEqual([]);
    expect((await restart.loadDocument()).updates).toEqual([]);
    expect(
      storage.sql.exec("SELECT * FROM page_document").toArray(),
    ).toHaveLength(1);
    live.destroy();
    restored.destroy();
  });

  test("failed appends and compactions roll back and remain retryable", async () => {
    const { storage } = fixture();
    const repository = new PageDocumentRepository(
      storage,
      createObjectDatabase(storage),
    );
    await repository.loadDocument();
    const live = new Y.Doc();
    live.getText("body").insert(0, "Saved");
    const update = Y.encodeStateAsUpdate(live);
    const exec = vi.mocked(storage.sql.exec).getMockImplementation()!;
    const fail = (pattern: RegExp) =>
      vi.mocked(storage.sql.exec).mockImplementation((query, ...values) => {
        if (pattern.test(query)) throw new Error("write failed");
        return exec(query, ...values);
      });
    fail(/update "page_document"/i);
    expect(() => repository.appendUpdates([update])).toThrow("write failed");
    expect((await repository.loadDocument()).sequence).toBe(0);
    expect(
      storage.sql.exec("SELECT * FROM page_document_updates").toArray(),
    ).toEqual([]);
    vi.mocked(storage.sql.exec).mockImplementation(exec);
    const sequence = repository.appendUpdates([update]);
    fail(/delete from "page_document_updates"/i);
    expect(() => repository.compact(update, sequence)).toThrow("write failed");
    const saved = await repository.loadDocument();
    expect(saved.snapshot).toBeNull();
    expect(saved.updates).toEqual([update]);
    vi.mocked(storage.sql.exec).mockImplementation(exec);
    repository.compact(update, sequence);
    expect((await repository.loadDocument()).updates).toEqual([]);
    live.destroy();
  });
});

describe("retiring workspace access groups", () => {
  test("SQL upgrade resolves scoped grants before dropping all group tables", async () => {
    const { storage } = fixture();
    for (const statement of workspaceMigrations.migrations.m0000.split(
      "--> statement-breakpoint",
    ))
      storage.sql.exec(statement);
    storage.sql.exec("INSERT INTO record_metadata VALUES ('structure',7,0)");
    storage.sql.exec(
      "INSERT INTO workspace_teams VALUES ('team',0,'Team',NULL,'owner',1)",
    );
    storage.sql.exec(
      "INSERT INTO workspace_team_members VALUES ('team','member',0,'alice')",
    );
    storage.sql.exec(
      "INSERT INTO workspace_channels VALUES ('team','page','page',NULL,0,'Page',NULL)",
    );
    storage.sql.exec(
      "INSERT INTO workspace_groups VALUES ('old',0,'Old','#000','owner')",
    );
    storage.sql.exec(
      "INSERT INTO workspace_group_members VALUES ('old',0,'alice')",
    );
    storage.sql.exec(
      "INSERT INTO workspace_group_members VALUES ('old',1,'outsider')",
    );
    storage.sql.exec(
      "INSERT INTO workspace_channel_groups VALUES ('team','page','page','view',0,'old')",
    );
    const repository = new WorkspaceRecordRepository(
      storage,
      createObjectDatabase(storage),
      new ObjectSyncRepository(
        storage,
        createObjectDatabase(storage),
        "workspace",
      ),
    );
    expect(await repository.loadPermissionImports()).toEqual([
      {
        scope_type: "page",
        scope_id: "page",
        subject_type: "user",
        subject_id: "alice",
        access: "read",
      },
    ]);
    expect(
      storage.sql
        .exec(
          "SELECT name FROM sqlite_master WHERE name IN ('workspace_groups','workspace_group_members','workspace_channel_groups')",
        )
        .toArray(),
    ).toEqual([]);
    await repository.finishPermissionImport();
    expect(
      await new WorkspaceRecordRepository(
        storage,
        createObjectDatabase(storage),
        new ObjectSyncRepository(
          storage,
          createObjectDatabase(storage),
          "workspace",
        ),
      ).loadPermissionImports(),
    ).toBeNull();
  });
  test("KV migration projects old grants once without retaining groups in structural state", async () => {
    const { storage, records } = fixture();
    const team = createDefaultTeam("owner");
    team.members.push("alice");
    const page = team.folders[0]!.channels[0]!;
    const legacy = {
      teams: [
        {
          ...team,
          folders: [
            {
              ...team.folders[0]!,
              channels: [{ ...page, viewGroups: ["old"], editGroups: [] }],
            },
          ],
        },
      ],
      groups: [{ id: "old", members: ["alice", "outsider"] }],
    };
    expect(
      legacyPermissionImports(legacy).filter(
        (row) => row.scope_type === "page",
      ),
    ).toEqual([
      {
        scope_type: "page",
        scope_id: page.id,
        subject_type: "user",
        subject_id: "alice",
        access: "read",
      },
    ]);
    records.set(makeWorkspaceStructureKey(), record(legacy));
    const repository = new WorkspaceRecordRepository(
      storage,
      createObjectDatabase(storage),
      new ObjectSyncRepository(
        storage,
        createObjectDatabase(storage),
        "workspace",
      ),
    );
    const loaded = await repository.loadWorkspace();
    expect(loaded.workspaceStructure.data).not.toHaveProperty("groups");
    expect(
      loaded.workspaceStructure.data.teams[0]!.folders[0]!.channels[0],
    ).not.toHaveProperty("viewGroups");
    expect(
      (await repository.loadPermissionImports())!.some(
        (row) => row.subject_id === "alice",
      ),
    ).toBe(true);
    await repository.finishPermissionImport();
    await new WorkspaceRecordRepository(
      storage,
      createObjectDatabase(storage),
      new ObjectSyncRepository(
        storage,
        createObjectDatabase(storage),
        "workspace",
      ),
    ).loadWorkspace();
    expect(await repository.loadPermissionImports()).toBeNull();
  });
});

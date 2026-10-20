import { ObjectSyncRepository } from "@wodge/core/sync/repositories/state";
import { createObjectDatabase } from "@wodge/infra/database/object-database";
import { attachSql } from "../helpers/sqlite";
import { PageRecordRepository } from "@wodge/core/pages/repositories/records";
// @vitest-environment jsdom

import type { PageActor, PageInputs } from "@wodge/domain/pages/dto";
import type { Db } from "@wodge/domain/pages/models";
import { TaskSchema } from "@wodge/domain/pages/validation";
import { IDBKeyRange, indexedDB } from "fake-indexeddb";
import { Replicache } from "replicache";
import { afterEach, describe, expect, test, vi } from "vitest";
import { pageMutators } from "../../../web/src/client/sync/pages/mutators";
import type PageParty from "../../src/servers/page";
import { executePageMutation } from "../helpers/mutations";

const clients: Replicache<typeof pageMutators>[] = [];

afterEach(async () => {
  await Promise.all(clients.splice(0).map((client) => client.close()));
  vi.unstubAllGlobals();
});

function createClient() {
  vi.stubGlobal("indexedDB", indexedDB);
  vi.stubGlobal("IDBKeyRange", IDBKeyRange);
  const client = new Replicache({
    name: `page-integration-${crypto.randomUUID()}`,
    mutators: pageMutators,
    pullInterval: null,
    logLevel: "error",
  });

  clients.push(client);

  return client;
}

function createParty() {
  const records = new Map<string, unknown>();
  const store = attachSql({
    get: vi.fn(async (key: string) => records.get(key)),
    put: vi.fn(async (key: string, value: unknown) => {
      records.set(key, structuredClone(value));
    }),
  });
  const party = {
    state: {
      record: {
        data: { columns: [], tasks: [] } as Db,
        lastModifiedVersion: 0,
        deleted: false,
      },
    },
    name: "fixture",
    ctx: {
      storage: store,
    },
    env: {},
  };

  return { party: party as unknown as PageParty, records };
}

const owner: PageActor = {
  userId: "page-owner",
  isOwner: true,
  isAdmin: false,
  isTeamModerator: false,
  canEdit: false,
};

function mutation(name: keyof PageInputs, args: unknown, version: number) {
  return { command: { name, args }, version };
}

function execute(party: PageParty, operation: ReturnType<typeof mutation>) {
  return executePageMutation(
    party,
    {
      mutation: { ...operation.command, id: 1, clientID: "client" },
      nextVersion: operation.version,
      userId: owner.userId,
    },
    { ...owner, canView: true },
  );
}

describe("page client and backend integration", () => {
  test("create, edit and cascading deletion agree across the extracted boundary", async () => {
    const client = createClient();
    const { party } = createParty();
    const column = { id: "todo", title: "Todo" };
    const task = TaskSchema.parse({
      id: "first",
      columnId: "todo",
      title: "  Draft  ",
    });

    await client.mutate.createColumn(column);
    await execute(party, mutation("createColumn", column, 1));
    await client.mutate.createTask({ task, col: column.id });
    await execute(party, mutation("createTask", { task, col: column.id }, 2));
    expect(await client.query((tx) => tx.get("tasks"))).toEqual(
      party.state.record.data.tasks,
    );
    expect(party.state.record.data.tasks[0]?.title).toBe("Draft");

    const edited = { ...task, title: "Reviewed", priority: "high" as const };

    await client.mutate.editTask({ task: edited });
    await execute(party, mutation("editTask", { task: edited }, 3));
    expect(await client.query((tx) => tx.get("tasks"))).toEqual(
      party.state.record.data.tasks,
    );

    await client.mutate.deleteColumn(column);
    await execute(party, mutation("deleteColumn", column, 4));
    expect(await client.query((tx) => tx.get("tasks"))).toEqual([]);
    expect(await client.query((tx) => tx.get("columns"))).toEqual([]);
    expect(
      (
        await new PageRecordRepository(
          party.ctx.storage,
          createObjectDatabase(party.ctx.storage),
          new ObjectSyncRepository(
            party.ctx.storage,
            createObjectDatabase(party.ctx.storage),
            "page",
          ),
        ).loadPage()
      ).state.record,
    ).toEqual({
      data: { tasks: [], columns: [] },
      lastModifiedVersion: 4,
      deleted: false,
    });
  });

  test("creating a task in a missing column inserts nothing on either side", async () => {
    const client = createClient();
    const { party } = createParty();
    const args = {
      col: "missing",
      task: TaskSchema.parse({ id: "first", columnId: "missing" }),
    };

    await client.mutate.createTask(args);
    await execute(party, mutation("createTask", args, 1));
    expect(await client.query((tx) => tx.get("tasks"))).toEqual([]);
    expect(party.state.record.data.tasks).toEqual([]);
    expect(
      (
        await new PageRecordRepository(
          party.ctx.storage,
          createObjectDatabase(party.ctx.storage),
          new ObjectSyncRepository(
            party.ctx.storage,
            createObjectDatabase(party.ctx.storage),
            "page",
          ),
        ).loadPage()
      ).state.record,
    ).toEqual(party.state.record);
  });

  test("backend storage failures propagate instead of returning false success", async () => {
    const { party } = createParty();

    vi.mocked(party.ctx.storage.sql.exec).mockImplementationOnce(() => {
      throw new Error("storage unavailable");
    });

    await expect(
      execute(party, mutation("createColumn", { id: "todo" }, 1)),
    ).rejects.toThrow("storage unavailable");
  });
});

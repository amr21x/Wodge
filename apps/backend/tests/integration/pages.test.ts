// @vitest-environment jsdom

import { afterEach, describe, expect, test, vi } from "vitest";
import { indexedDB, IDBKeyRange } from "fake-indexeddb";
import { Replicache, TEST_LICENSE_KEY } from "replicache";
import { TaskSchema, type Db } from "@wodge/domain/pages";
import { pageMutators } from "../../../web/src/client/sync/pages/mutators";
import { createColumn } from "../../src/page/create-column";
import { createTask } from "../../src/page/create-task";
import { editTask } from "../../src/page/edit-task";
import { deleteColumn } from "../../src/page/delete-column";
import type PageParty from "../../src/page/page-party";
import type { RunnerParams } from "../../src/lib/replicache";

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
    licenseKey: TEST_LICENSE_KEY,
    mutators: pageMutators,
    pullInterval: null,
    logLevel: "error",
  });
  clients.push(client);
  return client;
}

function createParty() {
  const records = new Map<string, unknown>();
  const party = {
    db: {
      data: { columns: [], tasks: [] } as Db,
      lastModifiedVersion: 0,
      deleted: false,
    },
    room: {
      storage: {
        put: vi.fn(async (key: string, value: unknown) => {
          records.set(key, structuredClone(value));
        }),
      },
    },
  };
  return { party: party as unknown as PageParty, records };
}

function mutation(name: string, args: unknown, version: number): RunnerParams {
  return {
    mutation: { id: version, clientID: "page-client", name, args },
    nextVersion: version,
    userId: "page-owner",
  };
}

describe("page client and backend integration", () => {
  test("create, edit and cascading deletion agree across the extracted boundary", async () => {
    const client = createClient();
    const { party, records } = createParty();
    const column = { id: "todo", title: "Todo" };
    const task = TaskSchema.parse({
      id: "first",
      columnId: "todo",
      title: "  Draft  ",
    });

    await client.mutate.createColumn(column);
    await createColumn(party, mutation("createColumn", column, 1));
    await client.mutate.createTask({ task, col: column.id });
    await createTask(
      party,
      mutation("createTask", { task, col: column.id }, 2),
    );
    expect(await client.query((tx) => tx.get("tasks"))).toEqual(
      party.db.data.tasks,
    );
    expect(party.db.data.tasks[0]?.title).toBe("Draft");

    const edited = { ...task, title: "Reviewed", priority: "high" as const };
    await client.mutate.editTask({ task: edited });
    await editTask(party, mutation("editTask", { task: edited }, 3));
    expect(await client.query((tx) => tx.get("tasks"))).toEqual(
      party.db.data.tasks,
    );

    await client.mutate.deleteColumn(column);
    await deleteColumn(party, mutation("deleteColumn", column, 4));
    expect(await client.query((tx) => tx.get("tasks"))).toEqual([]);
    expect(await client.query((tx) => tx.get("columns"))).toEqual([]);
    expect(records.get("db")).toEqual({
      data: { tasks: [], columns: [] },
      lastModifiedVersion: 4,
      deleted: false,
    });
  });

  test("creating a task in a missing column inserts nothing on either side", async () => {
    const client = createClient();
    const { party, records } = createParty();
    const args = {
      col: "missing",
      task: TaskSchema.parse({ id: "first", columnId: "missing" }),
    };
    await client.mutate.createTask(args);
    await createTask(party, mutation("createTask", args, 1));
    expect(await client.query((tx) => tx.get("tasks"))).toEqual([]);
    expect(party.db.data.tasks).toEqual([]);
    expect(records.get("db")).toEqual(party.db);
  });

  test("backend storage failures propagate instead of returning false success", async () => {
    const { party } = createParty();
    vi.mocked(party.room.storage.put).mockRejectedValueOnce(
      new Error("storage unavailable"),
    );
    await expect(
      createColumn(party, mutation("createColumn", { id: "todo" }, 1)),
    ).rejects.toThrow("storage unavailable");
  });
});

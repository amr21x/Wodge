import { ObjectSyncRepository } from "@wodge/core/sync/repositories/state";
import { createObjectDatabase } from "@wodge/infra/database/object-database";
import { PageRecordRepository } from "@wodge/core/pages/repositories/records";
import { attachSql } from "../helpers/sqlite";
// @vitest-environment node

import type { PageActor, PageInputs } from "@wodge/domain/pages/dto";
import type { Db } from "@wodge/domain/pages/models";
import { TaskSchema } from "@wodge/domain/pages/validation";
import { describe, expect, test, vi } from "vitest";
import type PageParty from "../../src/servers/page";
import { executePageMutation } from "../helpers/mutations";

type PageCommand = { name: keyof PageInputs; args: unknown };

const owner: PageActor = {
  userId: "owner",
  isOwner: true,
  isAdmin: false,
  isTeamModerator: false,
  canEdit: false,
};

const denied: PageActor = { ...owner, isOwner: false };

const columns = [
  { id: "a", title: "A" },
  { id: "b", title: "B" },
];

const first = TaskSchema.parse({ id: "first", columnId: "a", title: "First" });

const second = TaskSchema.parse({
  id: "second",
  columnId: "b",
  title: "Second",
});

function fixture() {
  const state = {
    record: {
      data: {
        columns: structuredClone(columns),
        tasks: [structuredClone(first), structuredClone(second)],
      },
      lastModifiedVersion: 3,
      deleted: false,
    },
  };
  const persisted = new Map<string, unknown>([
    ["db", structuredClone(state.record)],
  ]);
  const storage = attachSql({
    get: vi.fn(async (key: string) => persisted.get(key)),
    put: vi.fn(async (...args: unknown[]) => {
      persisted.set(args[0] as string, structuredClone(args[1]));
    }),
  });

  return {
    state,
    persisted,
    storage,
    service: {
      execute(command: PageCommand, actor: PageActor, version: number) {
        return executePageMutation(
          {
            state,
            name: "fixture",
            ctx: { storage: storage },
            env: {},
          } as unknown as PageParty,
          {
            mutation: { ...command, id: 1, clientID: "client" },
            nextVersion: version,
            userId: actor.userId,
          },
          { ...actor, canView: true },
        );
      },
    },
  };
}

const createdTask = TaskSchema.parse({
  id: "third",
  columnId: "a",
  title: "  New  ",
});

const commands: { command: PageCommand; expected: Db }[] = [
  {
    command: { name: "createColumn", args: { id: "c", title: " C " } },
    expected: {
      columns: [...columns, { id: "c", title: " C " }],
      tasks: [first, second],
    },
  },
  {
    command: { name: "updateColumn", args: { id: "a", title: "Renamed" } },
    expected: {
      columns: [{ id: "a", title: "Renamed" }, columns[1]!],
      tasks: [first, second],
    },
  },
  {
    command: { name: "deleteColumn", args: { id: "a" } },
    expected: { columns: [columns[1]!], tasks: [second] },
  },
  {
    command: { name: "createTask", args: { task: createdTask, col: "b" } },
    expected: {
      columns,
      tasks: [first, second, { ...createdTask, title: "New", columnId: "b" }],
    },
  },
  {
    command: {
      name: "editTask",
      args: { task: { ...first, title: "Edited" } },
    },
    expected: { columns, tasks: [{ ...first, title: "Edited" }, second] },
  },
  {
    command: { name: "deleteTask", args: { task: first } },
    expected: { columns, tasks: [second] },
  },
  {
    command: { name: "moveColumns", args: { c1: "a", c2: "b" } },
    expected: { columns: [columns[1]!, columns[0]!], tasks: [first, second] },
  },
  {
    command: {
      name: "moveTasks",
      args: { t1: "first", tOrC2: "second", isOverColumn: false },
    },
    expected: { columns, tasks: [second, { ...first, columnId: "b" }] },
  },
];

describe("page transport service caller", () => {
  test.each(commands)(
    "$command.name preserves state, version and persisted record",
    async ({ command, expected }) => {
      const { state, storage, service } = fixture();

      await service.execute(command, owner, 7);
      expect(state.record).toEqual({
        data: expected,
        lastModifiedVersion: 7,
        deleted: false,
      });
      expect(
        (
          await new PageRecordRepository(
            storage as unknown as DurableObjectStorage,
            createObjectDatabase(storage as unknown as DurableObjectStorage),
            new ObjectSyncRepository(
              storage as unknown as DurableObjectStorage,
              createObjectDatabase(storage as unknown as DurableObjectStorage),
              "page",
            ),
          ).loadPage()
        ).state.record,
      ).toEqual(state.record);
    },
  );

  test("all existing edit capabilities allow operations and missing permission is a no-op", async () => {
    for (const capability of [
      "isOwner",
      "isAdmin",
      "isTeamModerator",
      "canEdit",
    ] as const) {
      const { state, service } = fixture();

      await service.execute(
        { name: "deleteTask", args: { task: first } },
        { ...denied, [capability]: true },
        7,
      );
      expect(state.record.data.tasks).toEqual([second]);
    }

    const { state, storage, service } = fixture();
    const before = state.record;

    for (const { command } of commands) {
      await service.execute(command, denied, 7);
    }

    expect(state.record).toBe(before);
    expect(storage.put).not.toHaveBeenCalled();
  });

  test("unknown commands retain the allowed-actor error and denied-actor no-op", async () => {
    const { state, service, storage } = fixture();
    const command = { name: "unknown", args: {} } as unknown as PageCommand;

    await expect(service.execute(command, owner, 7)).rejects.toThrow(
      "Unknown mutation: unknown",
    );
    await expect(service.execute(command, denied, 7)).resolves.toBeUndefined();
    expect(state.record.lastModifiedVersion).toBe(3);
    expect(storage.put).not.toHaveBeenCalled();
  });

  test("commands read committed SQL rather than a stale sync projection and preserve unrelated rows", async () => {
    const { state, service, storage } = fixture();
    await service.execute(
      { name: "updateColumn", args: { id: "a", title: "Ready" } },
      owner,
      4,
    );
    storage.sql.exec(
      "UPDATE page_tasks SET title = 'Committed' WHERE id = 'first'",
    );
    state.record.data.columns = [];
    const exec = vi.mocked(storage.sql.exec);
    exec.mockClear();
    await service.execute(
      { name: "createTask", args: { col: "a", task: createdTask } },
      owner,
      5,
    );
    expect(
      state.record.data.tasks.find((task) => task.id === "first")?.title,
    ).toBe("Committed");
    expect(state.record.data.tasks.map((task) => task.id)).toEqual([
      "first",
      "second",
      "third",
    ]);
    expect(
      exec.mock.calls.some(([query]) =>
        /^delete from "page_tasks"|^update "page_tasks"/i.test(query),
      ),
    ).toBe(false);
    expect(storage.put).not.toHaveBeenCalled();
  });

  test("failed persistence preserves the last committed projection", async () => {
    const { state, service, storage, persisted } = fixture();

    vi.mocked(storage.sql.exec).mockImplementationOnce(() => {
      throw new Error("storage unavailable");
    });

    await expect(
      service.execute({ name: "deleteTask", args: { task: first } }, owner, 7),
    ).rejects.toThrow("storage unavailable");
    expect(state.record.data.tasks).toEqual([first, second]);
    expect(state.record.lastModifiedVersion).toBe(3);
    expect(persisted.get("db")).toEqual({
      data: { columns: state.record.data.columns, tasks: [first, second] },
      lastModifiedVersion: 3,
      deleted: false,
    });
  });
});

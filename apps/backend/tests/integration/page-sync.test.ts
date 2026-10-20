import { ObjectSyncRepository } from "@wodge/core/sync/repositories/state";
import { createObjectDatabase } from "@wodge/infra/database/object-database";
import * as Y from "yjs";
import { attachSql } from "../helpers/sqlite";
import { YServer } from "y-partyserver";
// @vitest-environment node
import { pageBindings } from "../helpers/bindings";
import { pagesRoutes } from "../helpers/routes";

import { makeClientGroupKey, makeClientKey } from "@wodge/domain/sync/index";
import { expect, test, vi } from "vitest";
import type PageParty from "../../src/servers/page";
import PageServer from "../../src/servers/page";

function fixture() {
  const records = new Map<string, unknown>();
  const get = vi.fn(async (key: string) => structuredClone(records.get(key)));
  const put = vi.fn(
    async (keyOrValues: string | Record<string, unknown>, value?: unknown) => {
      const entries =
        typeof keyOrValues === "string"
          ? [[keyOrValues, value]]
          : Object.entries(keyOrValues);

      for (const [key, data] of entries) {
        records.set(key as string, structuredClone(data));
      }
    },
  );
  const list = vi.fn(
    async ({ prefix }: { prefix: string }) =>
      new Map(
        [...records]
          .filter(([key]) => key.startsWith(prefix))
          .map(([key, value]) => [key, structuredClone(value)]),
      ),
  );
  const poke = vi.fn(async () => new Response(null, { status: 200 }));
  const party = {
    state: {
      record: {
        data: { columns: [], tasks: [] },
        lastModifiedVersion: 0,
        deleted: false,
      },
    },
    versions: new Map([["globalVersion", 0]]),
    name: "page",
    document: new Y.Doc(),
    ctx: { storage: attachSql({ get, put, list }) },
    env: {
      SECRET_KEY: "fixture",
      Workspace: {
        idFromName: (id: string) => id,
        get: () => ({
          setName: async () => {},
          fetch: poke,
        }),
      },
    },
  } as unknown as PageParty;
  const app = {
    request: (url: string, init?: RequestInit) =>
      pagesRoutes.request(
        url.replace("http://localhost", "http://localhost/parties/page/page"),
        init,
        pageBindings(party),
      ),
  };

  function push(
    id: number,
    permission = true,
    name = "createColumn",
    extraHeaders: Record<string, string> = {},
  ) {
    return app.request("http://localhost/replicache-push", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-user-id": "owner",
        "x-workspace-id": "workspace",
        "x-owner": String(permission),
        ...extraHeaders,
      },
      body: JSON.stringify({
        clientGroupID: "group",
        mutations: [
          {
            id,
            clientID: "client",
            name,
            args: { id: `column-${id}`, title: "Column" },
          },
        ],
      }),
    });
  }

  return { app, party, records, get, put, poke, push };
}

const clientKey = makeClientKey("client", makeClientGroupKey("group"));

test("pushes retain duplicate/gap handling and the pull acknowledgement contract", async () => {
  const { push, app, party, records, put, poke } = fixture();

  expect((await push(1)).status).toBe(200);
  expect((await push(1)).status).toBe(200);
  expect((await push(3)).status).toBe(500);
  expect(party.state.record.data.columns).toEqual([
    { id: "column-1", title: "Column" },
  ]);
  expect(
    vi
      .mocked(party.ctx.storage.sql.exec)
      .mock.calls.filter(([query]) =>
        /^insert into "page_columns"/i.test(query),
      ),
  ).toHaveLength(1);
  expect(put.mock.calls.filter(([key]) => key === "db")).toHaveLength(0);
  expect(
    await new ObjectSyncRepository(
      party.ctx.storage,
      createObjectDatabase(party.ctx.storage),
      "page",
    ).client(clientKey),
  ).toMatchObject({
    lastMutationID: 1,
    lastModifiedVersion: 1,
  });
  expect(party.versions.get("globalVersion")).toBe(2);
  expect(poke).toHaveBeenCalledTimes(2);

  const pull = await app.request("http://localhost/replicache-pull", {
    method: "POST",
    headers: { "x-user-id": "owner", "x-can-view": "true" },
    body: JSON.stringify({ cookie: null, clientGroupID: "group" }),
  });

  expect(pull.status).toBe(200);
  expect(await pull.json()).toEqual({
    cookie: 2,
    lastMutationIDChanges: { client: 1 },
    patch: [
      {
        op: "put",
        key: "columns",
        value: [{ id: "column-1", title: "Column" }],
      },
      { op: "put", key: "tasks", value: [] },
    ],
  });
});

test("denied pushes keep page data untouched while retaining sync acknowledgement and poke", async () => {
  const { push, party, records, poke } = fixture();

  expect((await push(1, false)).status).toBe(200);
  expect(party.state.record.data.columns).toEqual([]);
  expect(party.state.record.lastModifiedVersion).toBe(0);
  expect(records.has("db")).toBe(false);
  expect(
    await new ObjectSyncRepository(
      party.ctx.storage,
      createObjectDatabase(party.ctx.storage),
      "page",
    ).client(clientKey),
  ).toMatchObject({ lastMutationID: 1 });
  expect(poke).toHaveBeenCalledTimes(1);
});

test("a page storage failure returns 500 without acknowledging the failed command", async () => {
  const { push, party, records, poke } = fixture();

  const exec = vi.mocked(party.ctx.storage.sql.exec).getMockImplementation()!;
  vi.mocked(party.ctx.storage.sql.exec).mockImplementation(
    (query: string, ...bindings: SqlStorageValue[]) => {
      if (/^insert into "page_columns"/i.test(query))
        throw new Error("storage unavailable");
      return exec(query, ...bindings);
    },
  );
  expect((await push(1)).status).toBe(500);
  expect(party.state.record.lastModifiedVersion).toBe(0);
  expect(records.has("db")).toBe(false);
  expect(
    await new ObjectSyncRepository(
      party.ctx.storage,
      createObjectDatabase(party.ctx.storage),
      "page",
    ).client(clientKey),
  ).toMatchObject({ lastMutationID: 0 });
  expect(party.versions.get("globalVersion")).toBe(0);
  expect(poke).not.toHaveBeenCalled();
});

test("the retained startup adapter reloads the same page record and sync versions", async () => {
  vi.spyOn(YServer.prototype, "onStart").mockResolvedValue(undefined);
  const { push, party, records } = fixture();

  await push(1);
  const saved = structuredClone(party.state.record);

  party.state.record = {
    data: { columns: [], tasks: [] },
    lastModifiedVersion: 0,
    deleted: false,
  };
  party.versions = new Map();

  await PageServer.prototype.onStart.call(party);
  expect(party.state.record).toEqual(saved);
  expect(party.versions).toEqual(
    await new ObjectSyncRepository(
      party.ctx.storage,
      createObjectDatabase(party.ctx.storage),
      "page",
    ).loadVersions(),
  );
});

test("missing workspace context and denied reads retain their response statuses", async () => {
  const { app, put } = fixture();

  expect(
    (await app.request("http://localhost/replicache-push", { method: "POST" }))
      .status,
  ).toBe(400);
  expect(
    (
      await app.request("http://localhost/replicache-pull", {
        method: "POST",
        headers: { "x-user-id": "owner" },
      })
    ).status,
  ).toBe(401);
  expect(put).not.toHaveBeenCalled();
});

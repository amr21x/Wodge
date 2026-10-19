// @vitest-environment node
import {
  REPLICACHE_VERSIONS_KEY,
  makeClientGroupKey,
  makeClientKey,
} from "@wodge/domain/sync/index";
import type { HonoRequest } from "hono";
import { expect, test, vi } from "vitest";
import { repPull, repPush } from "../../src/lib/sync/replicache";
type Storage = DurableObjectStorage;

function fixture() {
  const records = new Map<string, unknown>();
  const storage = {
    async get(key: string) {
      return structuredClone(records.get(key));
    },
    async put(key: string | Record<string, unknown>, value?: unknown) {
      for (const [k, v] of typeof key === "string"
        ? [[key, value]]
        : Object.entries(key)) {
        records.set(k as string, structuredClone(v));
      }
    },
    async list({ prefix }: { prefix: string }) {
      return new Map(
        [...records]
          .filter(([key]) => key.startsWith(prefix))
          .map(([k, v]) => [k, structuredClone(v)]),
      );
    },
  } as unknown as Storage;
  const versions = new Map([["globalVersion", 3]]);
  const runner = vi.fn(async () => {});
  const patcher = vi.fn(async () => [
    { op: "put" as const, key: "data", value: { ok: true } },
  ]);
  const req = (body: unknown, user: string | null = "owner") =>
    ({
      header: () => user ?? undefined,
      json: async () => body,
    }) as unknown as HonoRequest;
  const push = (
    mutations: unknown,
    group = "group",
    user: string | null = "owner",
  ) =>
    repPush({
      storage,
      versions,
      runner,
      req: req({ clientGroupID: group, mutations }, user),
    });
  const pull = (
    cookie: number | null = null,
    group = "group",
    user: string | null = "owner",
  ) =>
    repPull({
      storage,
      versions,
      patcher,
      req: req({ clientGroupID: group, cookie }, user),
    });

  return { records, storage, versions, runner, patcher, req, push, pull };
}

const mutation = (id = 1, clientID = "client") => ({
  id,
  clientID,
  name: "operation",
  args: { value: id },
});

test("push rejects missing identity and malformed envelopes without running operations", async () => {
  const f = fixture();

  expect((await repPush({ ...f, req: f.req({}, null) })).status).toBe(401);
  expect((await repPush({ ...f, req: f.req({ mutations: [] }) })).status).toBe(
    400,
  );
  expect(f.runner).not.toHaveBeenCalled();
  expect(f.records.size).toBe(0);
});

test("push rejects a group owned by another user", async () => {
  const f = fixture();

  f.records.set(makeClientGroupKey("group"), { id: "group", userID: "other" });
  expect((await f.push([mutation()])).status).toBe(401);
  expect(f.runner).not.toHaveBeenCalled();
});

test("push rejects a stored client associated with another group", async () => {
  const f = fixture();

  f.records.set(makeClientKey("client", makeClientGroupKey("group")), {
    id: "client",
    clientGroupID: "other",
    lastMutationID: 0,
  });
  expect((await f.push([mutation()])).status).toBe(401);
  expect(f.runner).not.toHaveBeenCalled();
});

test("push runs consecutive mutations once, supports multiple clients and acknowledges one batch version", async () => {
  const f = fixture();

  expect(
    (await f.push([mutation(), mutation(2), mutation(1, "second")])).status,
  ).toBe(200);
  expect(f.runner.mock.calls).toHaveLength(3);
  expect(f.versions.get("globalVersion")).toBe(4);
  expect(
    f.records.get(makeClientKey("client", makeClientGroupKey("group"))),
  ).toMatchObject({ lastMutationID: 2, lastModifiedVersion: 4 });
  expect(
    f.records.get(makeClientKey("second", makeClientGroupKey("group"))),
  ).toMatchObject({ lastMutationID: 1 });
  expect((await f.push([mutation(), mutation(2)])).status).toBe(200);
  expect(f.runner).toHaveBeenCalledTimes(3);
});

test("push reports missing client state for a noninitial mutation", async () => {
  const f = fixture();

  expect(await (await f.push([mutation(2)])).json()).toEqual({
    error: "ClientStateNotFound",
  });
  expect(f.runner).not.toHaveBeenCalled();
});

test("push rejects a future mutation without advancing its stored acknowledgement", async () => {
  const f = fixture();

  await f.push([mutation()]);
  expect((await f.push([mutation(3)])).status).toBe(500);
  expect(
    f.records.get(makeClientKey("client", makeClientGroupKey("group"))),
  ).toMatchObject({ lastMutationID: 1 });
  expect(f.runner).toHaveBeenCalledOnce();
});

test("runner failure leaves acknowledgements unchanged; retry replays prior effects in the failed batch", async () => {
  const f = fixture();

  f.runner
    .mockResolvedValueOnce()
    .mockRejectedValueOnce(new Error("disk full"));
  expect((await f.push([mutation(), mutation(2)])).status).toBe(500);
  expect(f.versions.get("globalVersion")).toBe(3);
  expect(f.records.has(REPLICACHE_VERSIONS_KEY)).toBe(false);
  expect(
    f.records.get(makeClientKey("client", makeClientGroupKey("group"))),
  ).toMatchObject({ lastMutationID: 0 });
  expect((await f.push([mutation(), mutation(2)])).status).toBe(200);
  expect(f.runner).toHaveBeenCalledTimes(4);
});

test("initial pull allows a new group, uses version zero and returns the patch and current cookie", async () => {
  const f = fixture();

  expect(await (await f.pull()).json()).toEqual({
    cookie: 3,
    lastMutationIDChanges: {},
    patch: [{ op: "put", key: "data", value: { ok: true } }],
  });
  expect(f.patcher).toHaveBeenCalledWith({
    fromVersion: 0,
    versions: f.versions,
  });
  expect(f.records.size).toBe(0);
});

test("pull returns only acknowledgements newer than the cookie in the requested group", async () => {
  const f = fixture();

  await f.push([mutation()]);
  expect(await (await f.pull(3)).json()).toMatchObject({
    lastMutationIDChanges: { client: 1 },
    cookie: 4,
  });
  expect(await (await f.pull(4)).json()).toMatchObject({
    lastMutationIDChanges: {},
  });
  expect(await (await f.pull(0, "other")).json()).toMatchObject({
    lastMutationIDChanges: {},
  });
});

test("pull rejects identity, ownership and invalid cookies before constructing patches", async () => {
  const f = fixture();

  expect((await repPull({ ...f, req: f.req({}, null) })).status).toBe(401);
  expect(
    (
      await repPull({
        ...f,
        req: f.req({ clientGroupID: "group", cookie: "invalid" }),
      })
    ).status,
  ).toBe(400);
  f.records.set(makeClientGroupKey("group"), { userID: "other" });
  expect((await f.pull()).status).toBe(401);
  expect(f.patcher).not.toHaveBeenCalled();
});

test("patch construction failure returns a server error without modifying sync state", async () => {
  const f = fixture();

  f.patcher.mockRejectedValueOnce(new Error("read failure"));
  expect((await f.pull()).status).toBe(500);
  expect(f.records.size).toBe(0);
  expect(f.versions.get("globalVersion")).toBe(3);
});

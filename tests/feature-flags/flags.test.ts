import "reflect-metadata";
import {
  FEATURES,
  FEATURE_REGISTRY,
  FLAG_MAX_STALE_MS,
  FLAG_REQUEST_TIMEOUT_MS,
} from "@wodge/domain/features/models";
import { FeatureFlagService } from "@wodge/core/features/services/flags";
import type { FeatureFlagRepository } from "@wodge/core/features/repositories/flags";
import { FeatureFlagHandlers } from "../../apps/backend/src/handlers/feature-flags";
import { createRoomPatch } from "../../apps/backend/src/lib/sync/patches/rooms";
import { gatePageConnection } from "../../apps/backend/src/lib/feature-connection";

function databaseFlagReader(binding: {
  prepare(sql: string): {
    all(): Promise<{
      success: boolean;
      results?: { key: string; enabled: number }[];
    }>;
  };
}) {
  const repository: Pick<FeatureFlagRepository, "list"> = {
    list: async () => {
      const result = await binding
        .prepare("SELECT key, enabled FROM feature_flags")
        .all();
      if (!result.success || !result.results)
        throw new Error("Flags unavailable");
      return result.results;
    },
  };
  return new FeatureFlagService(repository as FeatureFlagRepository).read;
}
function featureHandlers(read: FeatureFlagService["read"]) {
  return new FeatureFlagHandlers({ read } as FeatureFlagService);
}
const gatePartyRequest = (
  request: Request,
  domain: string,
  read: FeatureFlagService["read"],
  storedType?: (mutation: {
    name: string;
    args: unknown;
  }) => string | undefined,
) => featureHandlers(read).party(request, domain, storedType);
const gateHttpFeature = (request: Request, read: FeatureFlagService["read"]) =>
  featureHandlers(read).http(request);
import { afterEach, describe, expect, it, vi } from "vitest";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import {
  closedFlags,
  createFlagReader,
  disabledFeature,
  resolveFlags,
} from "@wodge/core/features/flags";

import { httpFeatures, mutationFeatures } from "@wodge/core/features/policy";
import { pageFeatures } from "@/client/features/pages";

// Loaded through require because Vitest 1.x does not resolve the newer node:sqlite builtin.
const { DatabaseSync } = createRequire(import.meta.url)(
  "node:sqlite",
) as typeof import("node:sqlite");
const migration = readFileSync(
  "packages/domain/migrations/0003_feature_flags.sql",
  "utf8",
);
// Later migrations keep the table in line with the registry; they run once, in order.
const registrySync = readFileSync(
  "packages/domain/migrations/0010_feature_flag_registry.sql",
  "utf8",
);
const seed = readFileSync("packages/domain/seed-feature-flags.sql", "utf8");
function database() {
  const db = new DatabaseSync(":memory:");
  db.exec(migration);
  db.exec(registrySync);
  const binding = {
    prepare: (sql: string) => ({
      all: async () => ({ success: true, results: db.prepare(sql).all() }),
    }),
  };
  return { db, read: databaseFlagReader(binding) };
}
function request(
  domain: string,
  route = "/replicache-pull",
  mutations?: any[],
) {
  return new Request(`https://backend.example/parties/${domain}/id${route}`, {
    method: "POST",
    body: JSON.stringify({ mutations: mutations || [] }),
  });
}
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("database flag contract", () => {
  it("seeds the complete registry and preserves values on seed and migration reruns", async () => {
    const { db, read } = database();
    expect(
      db
        .prepare("SELECT key FROM feature_flags")
        .all()
        .map((row: any) => row.key)
        .sort(),
    ).toEqual([...FEATURES].sort());
    expect((await read()).flags).toEqual(resolveFlags([]));
    db.exec(
      "UPDATE feature_flags SET enabled=0 WHERE key='pages'; DELETE FROM feature_flags WHERE key='tasks'",
    );
    db.exec(seed);
    db.exec(migration);
    db.exec(registrySync);
    expect((await read()).flags.pages).toBe(false);
    expect((await read()).flags.tasks).toBe(true);
    expect(
      db.prepare("SELECT COUNT(*) AS count FROM feature_flags").get().count,
    ).toBe(FEATURES.length);
  });

  it("rejects malformed writes, ignores unknown keys, and clamps unavailable features", async () => {
    const { db, read } = database();
    for (const value of ["2", "NULL", "'true'", "0.5"]) {
      expect(() =>
        db.exec(`UPDATE feature_flags SET enabled=${value} WHERE key='pages'`),
      ).toThrow();
    }
    db.exec(
      "INSERT INTO feature_flags VALUES ('futureFlag',1); UPDATE feature_flags SET enabled=1 WHERE key IN ('calls','resources','hostedGeneration','agentAccess')",
    );
    const flags = (await read()).flags;
    expect(Object.keys(flags).sort()).toEqual([...FEATURES].sort());
    for (const key of FEATURES.filter(
      (key) => !FEATURE_REGISTRY[key].available,
    ))
      expect(flags[key]).toBe(false);
    for (const enabled of ["1", true, null, 2, {}, undefined])
      expect(resolveFlags([{ key: "pages", enabled }]).pages).toBe(false);
    expect(resolveFlags([{ key: "__proto__", enabled: 1 }])).toEqual(
      resolveFlags([]),
    );
  });

  it("uses closed cold-start values and expires last-known-good without extending grace", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-16T00:00:00Z"));
    let available = false;
    const load = vi.fn(async () => {
      if (!available) throw new Error("offline");
      return {
        flags: resolveFlags([]),
        source: "database" as const,
        validUntil: Date.now() + FLAG_MAX_STALE_MS,
      };
    });
    const read = createFlagReader(load);
    expect((await read()).flags).toEqual(closedFlags());
    available = true;
    const good = await read();
    available = false;
    vi.advanceTimersByTime(59_999);
    expect(await read()).toEqual({ ...good, source: "last-known-good" });
    vi.advanceTimersByTime(1);
    expect((await read()).flags).toEqual(closedFlags());
    available = true;
    expect((await read()).source).toBe("database");
    expect(load).toHaveBeenCalledTimes(5);
  });

  it("bounds hung database reads", async () => {
    vi.useFakeTimers();
    const read = databaseFlagReader({
      prepare: () => ({ all: () => new Promise(() => {}) }),
    });
    const operation = read();
    await vi.advanceTimersByTimeAsync(FLAG_REQUEST_TIMEOUT_MS);
    expect((await operation).flags).toEqual(closedFlags());
  });
});

describe("authoritative operation gates", () => {
  it("applies direct DB transitions to read/write gates and rejects whole mixed batches", async () => {
    const { db, read } = database();
    expect(
      await gatePartyRequest(request("thread"), "thread", read),
    ).toBeUndefined();
    db.exec("UPDATE feature_flags SET enabled=0 WHERE key='discussions'");
    expect(
      (await gatePartyRequest(request("thread"), "thread", read))?.status,
    ).toBe(403);
    const push = () =>
      request("workspace", "/replicache-push", [
        { name: "createTeam", args: {} },
        { name: "createThread", args: {} },
      ]);
    expect(
      await (await gatePartyRequest(push(), "workspace", read))?.json(),
    ).toEqual({ error: "FeatureDisabled", feature: "discussions" });
    db.exec("UPDATE feature_flags SET enabled=1 WHERE key='discussions'");
    expect(await gatePartyRequest(push(), "workspace", read)).toBeUndefined();
    db.exec("UPDATE feature_flags SET enabled=0 WHERE key='tasks'");
    expect(
      (await gatePartyRequest(request("page"), "page", read))?.status,
    ).toBe(403);
    expect(
      (
        await gatePartyRequest(
          request("page", "/replicache-push", [
            { name: "createTask", args: {} },
          ]),
          "page",
          read,
        )
      )?.status,
    ).toBe(403);
  });

  it("enforces direct HTTP reads/actions independently of client flags", async () => {
    const { db, read } = database();
    const getMembers = new Request(
      "https://app.example/api/workspaces/id/members",
    );
    expect(await gateHttpFeature(getMembers, read)).toBeUndefined();
    db.exec("UPDATE feature_flags SET enabled=0 WHERE key='membership'");
    expect((await gateHttpFeature(getMembers, read))?.status).toBe(403);
    const write = new Request("https://app.example/api/workspaces/id/invite", {
      method: "POST",
      headers: { "x-feature-membership": "true" },
      body: JSON.stringify({ flags: { membership: true } }),
    });
    expect((await gateHttpFeature(write, read))?.status).toBe(403);
    db.exec("UPDATE feature_flags SET enabled=1 WHERE key='membership'");
    expect(await gateHttpFeature(write, read)).toBeUndefined();
    expect(
      (
        await gateHttpFeature(
          new Request("https://app.example/api/new-capability"),
          read,
        )
      )?.status,
    ).toBe(403);
  });

  it("updates embedded read results after flag-only edits without a data version change", async () => {
    const { db, read } = database();
    const messages = [
      { id: "text", type: "text" },
      { id: "poll", type: "poll" },
      { id: "file", type: "file" },
    ];
    const party = {
      room: {
        storage: { get: async () => undefined, list: async () => new Map() },
      },
      versions: new Map([["globalVersion", 1]]),
      messages: { data: messages, lastModifiedVersion: 1 },
      readFlags: read,
    };
    // Storage-backed features start disabled; enable attachments as an operator would.
    db.exec("UPDATE feature_flags SET enabled=1 WHERE key='attachments'");
    const patch = createRoomPatch(party as any, "member", read);
    const pull = async () => ({
      patch: await patch({ fromVersion: 1 } as any),
    });
    expect((await pull()).patch[0].value).toHaveLength(3);
    db.exec(
      "UPDATE feature_flags SET enabled=0 WHERE key IN ('polls','attachments')",
    );
    expect((await pull()).patch[0].value.map((item: any) => item.id)).toEqual([
      "text",
    ]);
    expect(messages).toHaveLength(3);
    db.exec(
      "UPDATE feature_flags SET enabled=1 WHERE key IN ('polls','attachments')",
    );
    expect((await pull()).patch[0].value).toHaveLength(3);
  });

  it("covers votes, existing poll edits, folder updates, files, and unavailable MCP", async () => {
    const { db, read } = database();
    db.exec(
      "UPDATE feature_flags SET enabled=0 WHERE key IN ('polls','pages','attachments')",
    );
    const pollEdit = request("room", "/replicache-push", [
      { name: "editMessage", args: { message: { id: "poll", type: "text" } } },
    ]);
    expect(
      (await gatePartyRequest(pollEdit, "room", read, () => "poll"))?.status,
    ).toBe(403);
    expect(
      (
        await gatePartyRequest(
          request("room", "/replicache-push", [{ name: "vote", args: {} }]),
          "room",
          read,
        )
      )?.status,
    ).toBe(403);
    expect(
      mutationFeatures("workspace", "updateTeam", {
        teamUpdate: { action: "addFolder" },
      }),
    ).toEqual(["pages"]);
    expect(
      (
        await gatePartyRequest(
          request("workspace", "/file/team/channel"),
          "workspace",
          read,
        )
      )?.status,
    ).toBe(403);
    expect(
      disabledFeature((await read()).flags, httpFeatures("/api/mcp", "POST")!),
    ).toBe("agentAccess");
    expect(mutationFeatures("workspace", "toString", {})).toBeUndefined();
    expect(
      (
        await gatePartyRequest(
          request("workspace", "/replicache-push", [{ name: "newCapability" }]),
          "workspace",
          read,
        )
      )?.status,
    ).toBe(400);
  });

  it("keeps infrastructure usable with all switches off", async () => {
    const { db, read } = database();
    db.exec("UPDATE feature_flags SET enabled=0");
    expect(
      await gatePartyRequest(
        request("workspace", "/service/auth-channel"),
        "workspace",
        read,
      ),
    ).toBeUndefined();
    expect(
      await gatePartyRequest(request("workspace"), "workspace", read),
    ).toBeUndefined();
    expect(httpFeatures("/api/feature-flags", "GET")).toEqual([]);
    // Identity reads stay open. Polar webhooks are served by Better Auth under
    // /api/auth, which is outside the flag gate entirely.
    expect(httpFeatures("/api/users/me", "GET")).toEqual([]);
    expect(httpFeatures("/api/users/token", "GET")).toEqual([]);
    expect(pageFeatures("/login")).toEqual([]);
    expect(pageFeatures("/onboarding")).toEqual([]);
  });

  it("gates sends on an existing realtime connection without terminating it", async () => {
    const { db, read } = database();
    const handlers: Record<string, (event: any) => void> = {};
    const send = vi.fn();
    const close = vi.fn();
    const receive = vi.fn();
    const connection = {
      addEventListener: (type: string, listener: any) => {
        handlers[type] = listener;
      },
      send,
      close,
    };
    const guarded = gatePageConnection(
      connection,
      async () => (await read()).flags.pages,
    );
    connection.addEventListener("message", receive);
    const settle = () => new Promise((resolve) => setTimeout(resolve, 0));
    handlers.message!({ data: "first" });
    guarded.send("first");
    await settle();
    expect(receive).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledTimes(1);
    db.exec("UPDATE feature_flags SET enabled=0 WHERE key='pages'");
    handlers.message!({ data: "disabled" });
    guarded.send("disabled");
    await settle();
    expect(receive).toHaveBeenCalledTimes(2);
    expect(send).toHaveBeenCalledTimes(1);
    expect(close).not.toHaveBeenCalled();
    db.exec("UPDATE feature_flags SET enabled=1 WHERE key='pages'");
    handlers.message!({ data: "resumed" });
    guarded.send("resumed");
    await settle();
    expect(receive).toHaveBeenCalledTimes(3);
    expect(send).toHaveBeenCalledTimes(2);
  });
});

import assert from "node:assert/strict";
import { builtinModules } from "node:module";
import { createRequire } from "node:module";
import { mkdtemp, readFile, readdir, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../../../", import.meta.url));
// Exercise the exact compiler/runtime shipped with the pinned Worker tooling.
const toolRequire = createRequire(
  await realpath(
    path.join(root, "config/workers/node_modules/wrangler/package.json"),
  ),
);
const { build } = toolRequire("esbuild");
const { Miniflare, convertV4MiniflareOptions } = toolRequire("miniflare");
const output = await mkdtemp(path.join(tmpdir(), "wodge-foundation-"));
const failures = [];

/** @param {string} name @param {() => Promise<void>} test */
async function check(name, test) {
  try {
    await test();
    console.log(`Pass: ${name}`);
  } catch (error) {
    failures.push(name);
    console.error(
      `Fail: ${name}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

const forbidden =
  /(?:next-on-pages|(?:^|\/)next\/|@repo\/env\/index|packages\/env\/index|lib\/create-db|models\/auth\/auth|better-auth)/;
const common = {
  absWorkingDir: root,
  bundle: true,
  format: "esm",
  logLevel: "silent",
  metafile: true,
};
/** @type {InstanceType<typeof Miniflare> | undefined} */
let runtime;
try {
  await check(
    "page domain exports bundle without app, database, environment or sync clients",
    async () => {
      const result = await build({
        ...common,
        stdin: {
          contents:
            'export * from "@wodge/domain/pages"; export * from "@wodge/domain/channels"; export * from "@wodge/domain/constants";',
          resolveDir: path.join(root, "apps/backend"),
        },
        platform: "browser",
        write: false,
      });
      assert.deepEqual(
        Object.keys(result.metafile.inputs).filter((p) =>
          /(?:^apps\/|packages\/(?:data|env|backend-protocol)\/|node_modules\/.*(?:replicache|react|drizzle|partykit))/.test(
            p,
          ),
        ),
        [],
      );
      await assert.rejects(
        build({
          ...common,
          stdin: {
            contents: 'import "@wodge/domain/src/pages/mutations/create-task";',
            resolveDir: path.join(root, "apps/backend"),
          },
          platform: "browser",
          write: false,
        }),
        /Could not resolve/,
      );
    },
  );
  await check(
    "neutral domain bundle excludes browser configuration and server integrations",
    async () => {
      const result = await build({
        ...common,
        entryPoints: ["packages/data/index.ts"],
        platform: "browser",
        write: false,
      });
      const inputs = Object.keys(result.metafile.inputs);
      assert.deepEqual(
        inputs.filter(
          (p) =>
            forbidden.test(p) ||
            /query-client|browser-utils|create-.*-rep|react-query/.test(p),
        ),
        [],
      );
    },
  );
  await check(
    "browser adapters exclude server/database/auth modules",
    async () => {
      const result = await build({
        ...common,
        entryPoints: ["apps/backend/tests/foundation/browser.ts"],
        platform: "browser",
        write: false,
      });
      assert.deepEqual(
        Object.keys(result.metafile.inputs).filter((p) => forbidden.test(p)),
        [],
      );
    },
  );
  for (const [specifier, name] of [
    ["@wodge/data/server", "createDb"],
    ["@wodge/data/db", "createDb"],
    ["@wodge/backend-protocol", "betterAuth"],
  ]) {
    await check(`browser import of ${specifier} is rejected`, async () => {
      await assert.rejects(
        build({
          ...common,
          stdin: {
            contents: `import { ${name} } from ${JSON.stringify(specifier)}; console.log(${name});`,
            resolveDir: path.join(root, "apps/backend"),
          },
          platform: "browser",
          write: false,
        }),
        /No matching export/,
      );
    });
  }
  await check(
    "retained PartyKit backend entry points compile without Next context",
    async () => {
      const result = await build({
        ...common,
        entryPoints: [
          "server",
          "user/user-party",
          "workspace/workspace-party",
          "room/room-party",
          "thread/thread-party",
          "page/page-party",
        ].map((p) => `apps/backend/src/${p}.ts`),
        platform: "neutral",
        mainFields: ["module", "main"],
        conditions: ["workerd", "worker"],
        external: ["node:*", "cloudflare:*", ...builtinModules],
        outdir: path.join(output, "retained"),
      });
      assert.deepEqual(
        Object.keys(result.metafile.inputs).filter((p) =>
          /next-on-pages|packages\/env\/index/.test(p),
        ),
        [],
      );
    },
  );
  const worker = path.join(output, "worker.mjs");
  await check(
    "foundation Worker with actual auth/MCP/D1/PartyServer/Yjs imports compiles",
    async () => {
      const result = await build({
        ...common,
        entryPoints: ["apps/backend/tests/foundation/worker.ts"],
        platform: "neutral",
        mainFields: ["module", "main"],
        conditions: ["workerd", "worker"],
        external: ["node:*", "cloudflare:*", ...builtinModules],
        outfile: worker,
      });
      assert.deepEqual(
        Object.keys(result.metafile.inputs).filter((p) =>
          /next-on-pages|packages\/env\//.test(p),
        ),
        [],
      );
    },
  );
  await check(
    "local Worker imports run without provider environment or Next context",
    async () => {
      runtime = new Miniflare(
        convertV4MiniflareOptions({
          modules: true,
          modulesRoot: output,
          rootPath: output,
          scriptPath: worker,
          compatibilityDate: "2026-10-01",
          compatibilityFlags: ["nodejs_compat"],
          d1Databases: ["DB"],
          durableObjects: {
            FOUNDATION_ROOMS: { className: "FoundationRoom", useSQLite: true },
            FOUNDATION_PAGES: { className: "FoundationPage", useSQLite: true },
          },
        }),
      );
      const response = await runtime.dispatchFetch("http://localhost/imports");
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), {
        betterAuth: "function",
        mcp: "function",
        drizzleAdapter: "function",
        workspaceSchema: false,
        newWorkspace: true,
        database: "function",
      });
    },
  );
  await check(
    "existing migrations and shared user reads execute against the injected local D1",
    async () => {
      assert.ok(runtime);
      const db = await runtime.getD1Database("DB");
      const migrations = path.join(root, "packages/data/migrations");
      for (const file of (await readdir(migrations))
        .filter((p) => p.endsWith(".sql"))
        .sort()) {
        const sql = await readFile(path.join(migrations, file), "utf8");
        for (const statement of sql
          .split(";")
          .map((p) => p.replaceAll("--> statement-breakpoint", "").trim())
          .filter(Boolean))
          await db.prepare(statement).run();
      }
      await db
        .prepare(
          "INSERT INTO users (id,email,display_name,created_at,updated_at) VALUES (?,?,?,?,?)",
        )
        .bind(
          "foundation-owner",
          "owner@example.test",
          "Foundation owner",
          1700000000,
          1700000000,
        )
        .run();
      const response = await runtime.dispatchFetch(
        "http://localhost/user?id=foundation-owner",
      );
      assert.equal(response.status, 200);
      const user = await response.json();
      assert.equal(user.id, "foundation-owner");
      assert.equal(user.displayName, "Foundation owner");
      const absent = await runtime.dispatchFetch(
        "http://localhost/user?id=missing",
      );
      assert.equal(await absent.json(), null);
    },
  );
  await check(
    "workspace batch writes preserve owner membership and invite creation",
    async () => {
      const response = await runtime.dispatchFetch(
        "http://localhost/workspace",
        {
          method: "POST",
          body: JSON.stringify({
            id: "foundation-workspace",
            owner: "foundation-owner",
            name: "Foundation workspace",
            slug: "foundation-workspace",
          }),
        },
      );
      assert.equal(response.status, 200);
      const result = await response.json();
      assert.equal(
        result.workspace?.id,
        "foundation-workspace",
        JSON.stringify(result),
      );
      const workspaces = await (
        await runtime.dispatchFetch(
          "http://localhost/workspaces?id=foundation-owner",
        )
      ).json();
      assert.equal(workspaces.length, 1);
      assert.equal(workspaces[0].workspaces.id, "foundation-workspace");
      const db = await runtime.getD1Database("DB");
      const invite = await db
        .prepare("SELECT workspace_id,created_by FROM invites")
        .first();
      assert.deepEqual(invite, {
        workspace_id: "foundation-workspace",
        created_by: "foundation-owner",
      });
    },
  );
} finally {
  await runtime?.dispose();
  await rm(output, { recursive: true, force: true });
}
if (failures.length) process.exitCode = 1;

let foundationWorkspaceId = "";
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
    path.join(root, "apps/backend/node_modules/wrangler/package.json"),
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
  /(?:apps\/backend\/src\/|tsyringe|reflect-metadata|next-on-pages|(?:^|\/)next\/|packages\/env\/index|packages\/core\/|packages\/infra\/src\/(?:database\/|storage\/|payments\/|auth\/(?:tokens|supabase))|domain\/src\/(?:persistence|user\/schema|workspace\/schema|auth\/schema)|packages\/auth\/src\/(?:server|tickets|membership)|better-auth\/dist\/(?:auth|api|db|adapters)\/)/;

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
    "all browser-safe domain exports exclude hosts, persistence and sync clients",
    async () => {
      const entries = (
        await readdir(path.join(root, "packages/domain/src"), {
          recursive: true,
        })
      )
        .filter(
          (entry) =>
            entry.endsWith(".ts") &&
            !entry.startsWith("persistence/") &&
            !entry.includes("/schema/"),
        )
        .map((entry) => entry.slice(0, -3));
      const result = await build({
        ...common,
        stdin: {
          contents: entries
            .map((entry) => `export * from "@wodge/domain/${entry}";`)
            .join("\n"),
          resolveDir: path.join(root, "apps/backend"),
        },
        platform: "browser",
        write: false,
      });

      assert.deepEqual(
        Object.keys(result.metafile.inputs).filter((p) =>
          /(?:^apps\/|packages\/(?:core|env|backend-protocol)\/|node_modules\/.*(?:replicache|react|drizzle|partykit))/.test(
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
    "core services and repositories exclude hosts, transports, browser clients and provider implementations",
    async () => {
      const result = await build({
        ...common,
        stdin: {
          contents:
            'export {PageService} from "@wodge/core/pages/services/page"; export {WorkspaceService} from "@wodge/core/workspace/services/structure"; export {WorkspaceLifecycle} from "@wodge/core/workspace/services/lifecycle"; export {WorkspaceDirectory} from "@wodge/core/workspace/services/directory"; export {RoomService} from "@wodge/core/rooms/services/messages"; export {DiscussionService} from "@wodge/core/discussions/services/posts"; export {UserService} from "@wodge/core/user/services/memberships"; export {BillingService} from "@wodge/core/billing/services/billing";',
          resolveDir: path.join(root, "apps/backend"),
        },
        platform: "neutral",
        external: ["node:*"],
        conditions: ["workerd", "worker"],
        mainFields: ["module", "main"],
        write: false,
      });

      assert.deepEqual(
        Object.keys(result.metafile.inputs).filter(
          (p) =>
            !/^packages\/infra\/(?:src\/database\/(?:durable-sql|object-database|object-migrations)\.ts|database\/objects\/[^/]+\/bundle\.json)$/.test(
              p,
            ) &&
            /(?:^apps\/|packages\/(?:env|infra)\/|node_modules\/.*(?:partykit|partyserver|hono|replicache|react))/.test(
              p,
            ),
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
        entryPoints: [
          "apps/backend/tests/foundation/browser.ts",
          "apps/web/src/features/auth/client.ts",
          "apps/web/src/client/api.ts",
          "apps/web/src/client/features/flags.ts",
          "apps/web/src/client/features/pages.ts",
          ...["pages", "rooms", "discussions", "workspace"].map(
            (feature) => `apps/web/src/client/sync/${feature}/mutators.ts`,
          ),
        ],
        platform: "browser",
        outdir: path.join(output, "browser"),
        write: false,
      });

      assert.deepEqual(
        Object.keys(result.metafile.inputs).filter((p) => forbidden.test(p)),
        [],
      );
    },
  );
  await check(
    "common UI utilities exclude editor, feature, provider and server implementations",
    async () => {
      const result = await build({
        ...common,
        entryPoints: ["apps/web/src/lib/utils/index.ts"],
        platform: "browser",
        write: false,
      });

      assert.deepEqual(
        Object.keys(result.metafile.inputs).filter((p) =>
          /features\/|packages\/(?:core|env|auth|storage|payments|calls)\/|node_modules\/.*(?:tiptap|replicache|drizzle)/.test(
            p,
          ),
        ),
        [],
      );
    },
  );
  await check(
    "production Worker entry compiles without Next context",
    async () => {
      const result = await build({
        ...common,
        entryPoints: ["apps/backend/src/server.ts"],
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
    "fixture Worker with D1/PartyServer/Yjs imports compiles",
    async () => {
      const result = await build({
        ...common,
        entryPoints: ["apps/backend/tests/foundation/worker.ts"],
        banner: {
          js: 'import { createRequire as __createRequire } from "node:module"; const require = __createRequire("file:///worker.mjs");',
        },
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
      const migrations = path.join(root, "packages/domain/migrations");

      for (const file of (await readdir(migrations))
        .filter((p) => p.endsWith(".sql"))
        .sort()) {
        const sql = await readFile(path.join(migrations, file), "utf8");

        for (const statement of sql
          .split(";")
          .map((p) => p.replaceAll("--> statement-breakpoint", "").trim())
          .filter(Boolean)) {
          await db.prepare(statement).run();
        }
      }

      await db
        .prepare(
          "INSERT INTO auth_users (id,name,email,email_verified,created_at,updated_at) VALUES (?,?,?,?,?,?)",
        )
        .bind(
          "foundation-owner",
          "Foundation owner",
          "owner@example.test",
          1,
          1700000000000,
          1700000000000,
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
    "Better Auth creates the canonical workspace and owner membership",
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

      assert.match(result.workspace.id, /^[0-9a-f-]{14}7/);
      foundationWorkspaceId = result.workspace.id;
      const fixtureDb = await runtime.getD1Database("DB");
      await fixtureDb
        .prepare(
          "INSERT INTO invites (token, created_by, workspace_id) VALUES (?, ?, ?)",
        )
        .bind("fixture-invite", "foundation-owner", foundationWorkspaceId)
        .run();
      const workspaces = await (
        await runtime.dispatchFetch(
          "http://localhost/workspaces?id=foundation-owner",
        )
      ).json();

      assert.equal(workspaces.length, 1);
      assert.equal(workspaces[0].workspaces.id, foundationWorkspaceId);
      const db = await runtime.getD1Database("DB");
      const invite = await db
        .prepare("SELECT workspace_id,created_by FROM invites")
        .first();

      assert.deepEqual(invite, {
        workspace_id: foundationWorkspaceId,
        created_by: "foundation-owner",
      });
    },
  );
  await check(
    "relocated directory repositories preserve join previews, invite rotation and invite toggling against D1",
    async () => {
      assert.ok(runtime);
      const path =
        "http://localhost/workspace-directory?id=" + foundationWorkspaceId;
      const rotated = await (
        await runtime.dispatchFetch(path, { method: "POST" })
      ).json();

      assert.equal(rotated.token.length, 8);
      const read = async () => {
        assert.ok(runtime);

        return (
          await runtime.dispatchFetch(path + "&token=" + rotated.token)
        ).json();
      };
      const before = await read();

      assert.equal(before.preview.data.invites.token, rotated.token);
      assert.equal(before.preview.workspace.id, foundationWorkspaceId);
      assert.equal(before.membership.userId, "foundation-owner");
      assert.deepEqual(before.members, [{ userId: "foundation-owner" }]);
      assert.equal(before.invites[0].createdBy, "foundation-owner");

      await runtime.dispatchFetch(path, { method: "PATCH" });
      assert.equal(
        (await read()).preview.workspace.isInviteLinkEnabled,
        !before.preview.workspace.isInviteLinkEnabled,
      );

      await runtime.dispatchFetch(path, { method: "PATCH" });
      assert.equal(
        (await read()).preview.workspace.isInviteLinkEnabled,
        before.preview.workspace.isInviteLinkEnabled,
      );
    },
  );
  await check(
    "UUIDv7 database defaults persist alongside existing identifiers in the Worker runtime",
    async () => {
      const response = await runtime.dispatchFetch(
        "http://localhost/entity-identifiers",
      );

      assert.equal(response.status, 200);
      const { user, workspace, reloaded, legacy } = await response.json();
      const uuid7 =
        /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

      assert.match(user.id, uuid7);
      assert.match(workspace.id, uuid7);
      assert.notEqual(user.id, workspace.id);
      assert.equal(workspace.owner, user.id);
      assert.equal(reloaded.id, user.id);
      assert.equal(legacy.id, "foundation-owner");
    },
  );
  await check(
    "page commands persist through actual local object storage and service reconstruction",
    async () => {
      assert.ok(runtime);
      const actor = {
        userId: "owner",
        isOwner: true,
        isAdmin: false,
        isTeamModerator: false,
        canEdit: false,
      };
      /**
       * @param {{name:string,args:unknown}} command
       * @param {number} version
       * @param {import("@wodge/domain/pages/dto").PageActor} [capability]
       */
      const send = (command, version, capability = actor) =>
        runtime.dispatchFetch("http://localhost/page-commands?id=page-a", {
          method: "POST",
          body: JSON.stringify({ command, version, actor: capability }),
        });
      const created = await send(
        { name: "createColumn", args: { id: "todo", title: "Todo" } },
        1,
      );

      assert.equal(created.status, 200);
      const task = {
        id: "first",
        columnId: "todo",
        title: "  Draft  ",
        includeTime: false,
      };

      assert.equal(
        (await send({ name: "createTask", args: { task, col: "todo" } }, 2))
          .status,
        200,
      );
      const saved = await (
        await runtime.dispatchFetch("http://localhost/page-commands?id=page-a")
      ).json();

      assert.deepEqual(saved, {
        data: {
          columns: [{ id: "todo", title: "Todo" }],
          tasks: [{ ...task, title: "Draft" }],
        },
        lastModifiedVersion: 2,
        deleted: false,
      });
      const denied = await send(
        { name: "deleteColumn", args: { id: "todo" } },
        3,
        { ...actor, isOwner: false },
      );

      assert.deepEqual(await denied.json(), saved);
      assert.deepEqual(
        await (
          await runtime.dispatchFetch(
            "http://localhost/page-commands?id=page-a",
          )
        ).json(),
        saved,
      );
      assert.deepEqual(
        await (
          await runtime.dispatchFetch(
            "http://localhost/page-commands?id=page-b",
          )
        ).json(),
        {
          data: { columns: [], tasks: [] },
          lastModifiedVersion: 0,
          deleted: false,
        },
      );
    },
  );
  await check(
    "workspace, room, discussion and user services persist through actual object storage",
    async () => {
      assert.ok(runtime);
      const actor = {
        userId: "owner",
        isOwner: true,
        isAdmin: false,
        isTeamModerator: false,
        canEdit: false,
        canView: false,
      };
      /** @param {string} feature @param {string} [name] @param {unknown} [args] @param {string} [userId] */
      const request = async (feature, name, args, userId = "owner") => {
        assert.ok(runtime);
        const response = await runtime.dispatchFetch(
          `http://localhost/feature-commands?feature=${feature}&id=features`,
          {
            method: name ? "POST" : "GET",
            body: name
              ? JSON.stringify({
                  command: { name, args },
                  version: 3,
                  actor: { ...actor, userId },
                })
              : undefined,
          },
        );

        assert.equal(response.status, 200);

        return response.json();
      };

      await request("workspace", "createWorkspace", {});
      await request("workspace", "createTeam", {
        id: "second-team-1234",
        name: "Second",
      });
      const workspace = await request("workspace");

      assert.equal(workspace.workspaceStructure.data.teams.length, 2);
      assert.equal(workspace.workspaceMembers.data.createdBy, "owner");

      await request(
        "workspace",
        "createTeam",
        { id: "denied-team-1234", name: "Denied" },
        "outsider",
      );
      assert.equal(
        (await request("workspace")).workspaceStructure.data.teams.length,
        2,
      );

      await request("rooms", "sendMessage", {
        id: "message",
        sender: "owner",
        content: "Hello",
        date: "2026-10-16T00:00:00.000Z",
      });
      assert.equal((await request("rooms")).messages.data[0].content, "Hello");

      await request("discussions", "createPost", {
        id: "post",
        author: "owner",
        content: "Question",
        type: "qa",
        createdAt: "2026-10-16T00:00:00.000Z",
      });
      assert.equal(
        (await request("discussions")).threadPosts.data[0].content,
        "Question",
      );

      await request("user", "addWorkspace", "workspace");
      assert.deepEqual(await request("user"), ["workspace"]);

      await request("user", "removeWorkspace", "workspace");
      assert.deepEqual(await request("user"), []);
    },
  );
} finally {
  await runtime?.dispose();
  await rm(output, { recursive: true, force: true });
}

if (failures.length) {
  process.exitCode = 1;
}

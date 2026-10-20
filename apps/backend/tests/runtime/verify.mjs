import assert from "node:assert/strict";
import { builtinModules, createRequire } from "node:module";
import { mkdtemp, readFile, readdir, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../../../", import.meta.url));

const require = createRequire(
  await realpath(
    path.join(root, "config/workers/node_modules/wrangler/package.json"),
  ),
);

const { build } = require("esbuild");

const { Miniflare, convertV4MiniflareOptions } = require("miniflare");

const output = await mkdtemp(path.join(tmpdir(), "wodge-runtime-"));

const stripeSubscriptions = new Map();

/** @type {string[]} */
const failures = [];

/** @type {InstanceType<typeof Miniflare> | undefined} */
let runtime;

let cookie = "";

/** @type {{ id: string }} */
let user;

let ticket = "";

/** @type {{ id: string }} */
let workspace;

let authorizationMemberCookie = "";

/** @type {any} */
let structure;

const origin = "http://localhost:3000";

/** @param {string} name @param {() => Promise<void>} run */
async function check(name, run) {
  try {
    await run();
    console.log(`Pass: ${name}`);
  } catch (error) {
    failures.push(name);
    console.error(`Fail: ${name}`, error);
  }
}

/** @param {string} url @param {RequestInit} [init] */
async function request(url, init = {}, authenticated = true) {
  const headers = new Headers(init.headers);

  if (authenticated && cookie && !headers.has("cookie")) {
    headers.set("cookie", cookie);
  }

  if (init.method && init.method !== "GET") {
    headers.set("origin", origin);
  }

  // Serialize the host Node FormData before handing it to Miniflare's fetch implementation.

  if (init.body instanceof FormData) {
    const multipart = new Response(init.body);

    headers.set(
      "content-type",
      multipart.headers.get("content-type") ?? "multipart/form-data",
    );
    init = { ...init, body: await multipart.arrayBuffer() };
  }

  return runtime.dispatchFetch(origin + url, {
    ...init,
    headers,
    signal: AbortSignal.timeout(15000),
  });
}

/** @param {unknown} body */
const json = (body) => ({
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

/** Exercise real Better Auth OAuth state/callback handling against the provider network fixture. */
async function signIn(email) {
  const start = await request(
    "/api/auth/sign-in/social",
    json({ provider: "github", callbackURL: "/" }),
    false,
  );
  assert.equal(start.status, 200, await start.clone().text());
  const authorization = new URL((await start.json()).url);
  const stateCookie = start.headers
    .getSetCookie()
    .map((value) => value.split(";")[0])
    .join("; ");
  const callback = await request(
    `/api/auth/callback/github?code=${encodeURIComponent(email)}&state=${encodeURIComponent(authorization.searchParams.get("state"))}`,
    { headers: { cookie: stateCookie }, redirect: "manual" },
    false,
  );
  assert.equal(callback.status, 302, await callback.clone().text());
  const sessionCookie = callback.headers
    .getSetCookie()
    .map((value) => value.split(";")[0])
    .join("; ");
  assert.ok(sessionCookie.includes("session_token"));
  const profile = await request(
    "/api/users/me",
    { headers: { cookie: sessionCookie } },
    false,
  );
  assert.equal(profile.status, 200, await profile.clone().text());
  return { cookie: sessionCookie, user: await profile.json() };
}

try {
  const worker = path.join(output, "worker.mjs");

  await build({
    absWorkingDir: root,
    entryPoints: ["apps/backend/src/server.ts"],
    outfile: worker,
    bundle: true,
    format: "esm",
    platform: "neutral",
    mainFields: ["module", "main"],
    conditions: ["workerd", "worker"],
    external: ["node:*", "cloudflare:*", ...builtinModules],
    logLevel: "silent",
    banner: {
      js: 'import { createRequire as __createRequire } from "node:module"; const require = __createRequire("file:///worker.mjs");',
    },
  });
  const runtimeOptions = {
    modules: true,
    modulesRoot: output,
    rootPath: output,
    scriptPath: worker,
    compatibilityDate: "2026-10-01",
    compatibilityFlags: ["nodejs_compat"],
    d1Databases: ["DB"],
    durableObjects: Object.fromEntries(
      ["User", "Workspace", "Room", "Thread", "Page"].map((name) => [
        name,
        { className: name + "Server", useSQLite: true },
      ]),
    ),
    bindings: {
      APP_DOMAIN: origin,
      BACKEND_DOMAIN: origin,
      AVATARS_URL: "https://avatars.example.test",
      BETTER_AUTH_SECRET: "test-only-auth-secret-with-more-than-32-characters",
      SECRET_KEY: "test-only-internal-and-ticket-secret",
      R2_ENDPOINT: "https://objects.example.test",
      R2_ACCESS_KEY: "test",
      R2_SECRET_KEY: "test",
      STRIPE_SECRET_KEY: "sk_test_runtime",
      STRIPE_WH_SECRET: "whsec_runtime",
      LIVEKIT_API_KEY: "must-not-enable-calls",
      LIVEKIT_API_SECRET: "must-not-enable-calls-even-with-credentials",
      GOOGLE_CLIENT_ID: "test-google",
      GOOGLE_CLIENT_SECRET: "test-google-secret",
      GITHUB_CLIENT_ID: "test-github",
      GITHUB_CLIENT_SECRET: "test-github-secret",
    },
    outboundService: async (/** @type {Request} */ req) => {
      const url = new URL(req.url);
      if (
        url.hostname === "github.com" &&
        url.pathname === "/login/oauth/access_token"
      ) {
        const body = await req.text();
        const code = req.headers.get("content-type")?.includes("json")
          ? JSON.parse(body).code
          : new URLSearchParams(body).get("code");
        return Response.json({
          access_token: code,
          token_type: "bearer",
          scope: "read:user,user:email",
        });
      }
      if (url.hostname === "api.github.com") {
        const email = req.headers
          .get("authorization")
          ?.replace(/^Bearer /i, "");
        assert.ok(
          ["owner@example.test", "viewer@example.test"].includes(email),
        );
        if (url.pathname === "/user/emails")
          return Response.json([{ email, primary: true, verified: true }]);
        return Response.json({
          id: email === "owner@example.test" ? 1 : 2,
          email,
          login: email.split("@")[0],
          name: email.split("@")[0],
          avatar_url: null,
        });
      }

      if (new URL(req.url).hostname === "api.stripe.com") {
        const id = new URL(req.url).pathname.split("/").pop();
        const value = stripeSubscriptions.get(id);
        const subscription =
          typeof value === "function" ? await value() : value;
        return subscription
          ? Response.json(subscription)
          : Response.json(
              {
                error: {
                  message: "Unknown subscription",
                  type: "invalid_request_error",
                },
              },
              { status: 404 },
            );
      }
      if (new URL(req.url).hostname.endsWith("objects.example.test")) {
        await req.arrayBuffer();

        return new Response(null, {
          status: 200,
          headers: { etag: '"test-etag"', "content-length": "0" },
        });
      }

      throw new Error(`Unexpected external request: ${req.url}`);
    },
  };

  runtime = new Miniflare(convertV4MiniflareOptions(runtimeOptions));

  let database = await runtime.getD1Database("DB");

  for (const migration of (
    await readdir(path.join(root, "packages/domain/migrations"))
  )
    .filter((name) => name.endsWith(".sql"))
    .sort()) {
    const sql = await readFile(
      path.join(root, "packages/domain/migrations", migration),
      "utf8",
    );
    if (migration === "0005_canonical_organizations.sql") {
      const { seedOrganizationMigration } =
        await import("./organization-migration.mjs");
      await seedOrganizationMigration(database, sql);
    }

    if (migration === "0006_canonical_users.sql") {
      const { seedUserMigration } = await import("./user-migration.mjs");
      await seedUserMigration(database, sql);
    }

    for (const statement of sql
      .replaceAll("--> statement-breakpoint", "")
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean)) {
      await database.prepare(statement).run();
    }
  }

  await check(
    "canonical user migration preserves profiles and sessions and removes duplicate storage",
    async () => {
      const { verifyUserMigration } = await import("./user-migration.mjs");
      await verifyUserMigration(database);
    },
  );

  await check(
    "canonical organization migration preserves workspace IDs, memberships, invitations and billing state",
    async () => {
      const { verifyOrganizationMigration } =
        await import("./organization-migration.mjs");
      await verifyOrganizationMigration(database);
    },
  );

  await check(
    "production entry serves health and rejects unauthenticated API and WebSocket requests",
    async () => {
      assert.equal((await request("/health")).status, 200);
      assert.equal(
        (await request("/api/users/me", { headers: { "x-user-id": "forged" } }))
          .status,
        401,
      );
      assert.equal(
        (
          await request("/parties/user/forged", {
            headers: { upgrade: "websocket", "x-user-id": "forged" },
          })
        ).status,
        401,
      );
      assert.equal(
        (
          await request("/parties/workspace/id/service/poke", {
            method: "POST",
          })
        ).status,
        403,
      );
    },
  );

  await check(
    "GitHub OAuth callback creates a UUIDv7 auth identity and session cookie",
    async () => {
      const result = await signIn("owner@example.test");
      cookie = result.cookie;
      assert.match(
        result.user.id,
        /^[\da-f]{8}-[\da-f]{4}-7[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i,
      );
    },
  );

  await check("OAuth session lookup returns the canonical user", async () => {
    const first = await request("/api/users/me");

    assert.equal(first.status, 200, await first.clone().text());
    user = await first.json();
    assert.equal((await request("/api/users/me")).status, 200);
    const count = await database
      .prepare("SELECT COUNT(*) AS count FROM auth_users WHERE id = ?")
      .bind(user.id)
      .first();

    assert.equal(count.count, 1);
    const stored = await database
      .prepare("SELECT id FROM auth_users WHERE id = ?")
      .bind(user.id)
      .first();

    assert.equal(stored.id, user.id);
  });

  await check(
    "profile update uses verified identity and updates a real user Durable Object",
    async () => {
      const response = await request("/api/users/update", {
        ...json({ username: "owner", displayName: "Owner", avatar: "" }),
        headers: { "content-type": "application/json", "x-user-id": "forged" },
      });

      assert.equal(response.status, 200, await response.clone().text());
      assert.equal((await response.json()).user.id, user.id);
    },
  );

  await check(
    "workspace create and list coordinate real D1 and Durable Objects",
    async () => {
      const response = await request(
        "/api/workspaces/new",
        json({ name: "Runtime workspace", slug: "runtime-workspace" }),
      );

      assert.equal(response.status, 201, await response.clone().text());
      workspace = (await response.json()).workspace;
      const list = await request("/api/users/workspaces");

      assert.equal(list.status, 200);
      assert.equal((await list.json())[0].id, workspace.id);
      assert.equal(
        (await request(`/api/workspaces/${workspace.id}/members`)).status,
        200,
      );
    },
  );

  await check(
    "D1 flag edits gate Worker APIs and direct object operations while preserving recovery",
    async () => {
      const snapshot = await request("/api/feature-flags", {}, false);
      assert.equal(snapshot.status, 200);
      assert.equal((await snapshot.json()).flags.membership, true);
      await database
        .prepare(
          "UPDATE feature_flags SET enabled=0 WHERE key IN ('membership','workspaceCreation','profiles','teamManagement')",
        )
        .run();
      try {
        const flags = await request("/api/feature-flags", {}, false);
        assert.equal((await flags.json()).flags.membership, false);
        assert.equal(
          (await request(`/api/workspaces/${workspace.id}/members`)).status,
          403,
        );
        assert.equal(
          (
            await request(
              "/api/workspaces/new",
              json({ name: "Disabled", slug: "disabled" }),
            )
          ).status,
          403,
        );
        assert.equal((await request("/api/users/me")).status, 200);
        assert.equal((await request("/api/users/workspaces")).status, 200);
        const profile = await request(
          "/api/users/update",
          json({ displayName: "Disabled update" }),
        );
        assert.equal(profile.status, 403);
        const denied = await request(
          `/parties/workspace/${workspace.id}/replicache-push`,
          {
            ...json({
              clientGroupID: "disabled-flags",
              mutations: [
                {
                  id: 1,
                  clientID: "disabled-flags",
                  name: "createTeam",
                  args: {},
                },
              ],
            }),
          },
        );
        assert.equal(denied.status, 403, await denied.clone().text());
        assert.equal((await denied.json()).feature, "teamManagement");
      } finally {
        await database
          .prepare(
            "UPDATE feature_flags SET enabled=1 WHERE key IN ('membership','workspaceCreation','profiles','teamManagement')",
          )
          .run();
      }
      assert.equal(
        (await request(`/api/workspaces/${workspace.id}/members`)).status,
        200,
      );
    },
  );

  await check(
    "sync requests retain acknowledgement and pull behavior through the Worker",
    async () => {
      const response = await request("/api/replicache/pull", {
        ...json({
          clientGroupID: "runtime",
          cookie: null,
          pullVersion: 1,
          schemaVersion: "",
        }),
        headers: {
          "content-type": "application/json",
          domain: "workspace",
          id: workspace.id,
        },
      });

      assert.equal(response.status, 200, await response.clone().text());
      const pull = await response.json();

      assert.ok(Array.isArray(pull.patch));
      structure = pull.patch.find(
        (/** @type {{ key?: string }} */ patch) =>
          patch.key === "workspace/structure",
      ).value;
    },
  );

  await check(
    "session-bound tickets authorize user WebSockets and enforce object ownership",
    async () => {
      const response = await request("/api/users/token");

      assert.equal(response.status, 200);
      ticket = (await response.json()).token;
      assert.equal(
        (
          await request(
            `/parties/user/other?token=${ticket}`,
            { headers: { upgrade: "websocket" } },
            false,
          )
        ).status,
        403,
      );
      const connected = await request(
        `/parties/user/${user.id}?token=${ticket}`,
        { headers: { upgrade: "websocket" } },
        false,
      );

      assert.equal(connected.status, 101);
      connected.webSocket.accept();
      connected.webSocket.close();
    },
  );

  let restartCount = 0;
  async function restart() {
    await runtime.setOptions(
      convertV4MiniflareOptions({
        ...runtimeOptions,
        bindings: {
          ...runtimeOptions.bindings,
          RESTART_MARKER: String(++restartCount),
        },
      }),
    );
    database = await runtime.getD1Database("DB");
  }

  await check(
    "page collaboration synchronizes two clients and restores its SQLite snapshot/update journal",
    async () => {
      const { verifyCollaboration } = await import("./collaboration.mjs");

      const collaboration = await verifyCollaboration({
        root,
        request,
        json,
        database,
        workspace,
        structure,
        signIn,
        restart,
      });
      authorizationMemberCookie = collaboration.viewerCookie;
    },
  );

  await check(
    "relational structural state and sync acknowledgements survive restart and retries",
    async () => {
      const { verifyStructuralPersistence } =
        await import("./structural-persistence.mjs");
      await verifyStructuralPersistence({
        root,
        request,
        json,
        workspace,
        structure,
        restart,
      });
    },
  );

  await check(
    "custom roles enforce room scope, invalidate warm grants and retain denied mutation acknowledgements",
    async () => {
      const { verifyAuthorization } = await import("./authorization.mjs");
      await verifyAuthorization({
        request,
        json,
        database,
        workspace,
        structure,
        memberCookie: authorizationMemberCookie,
      });
    },
  );

  await check(
    "coordinated workspace settings, invite links, roles, leave and deletion synchronize Durable Objects",
    async () => {
      const { verifyOrganizations } = await import("./organizations.mjs");
      await verifyOrganizations({
        request,
        json,
        database,
        memberCookie: authorizationMemberCookie,
      });
    },
  );

  await check(
    "OAuth initiates in backend and untrusted callback state is rejected",
    async () => {
      const response = await request(
        "/api/auth/sign-in/social",
        json({ provider: "github", callbackURL: "/" }),
      );

      assert.equal(response.status, 200, await response.clone().text());
      assert.equal(new URL((await response.json()).url).hostname, "github.com");
      const callback = await request(
        "/api/auth/callback/github?code=fake&state=invalid",
        { redirect: "manual" },
        false,
      );

      assert.ok(callback.status === 302 || callback.status === 400);
    },
  );

  await check(
    "email sign-in endpoints are absent and untrusted authentication origins are rejected",
    async () => {
      for (const path of [
        "/api/auth/email-otp/send-verification-otp",
        "/api/auth/sign-in/email-otp",
      ]) {
        const disabled = await request(
          path,
          json({
            email: "disabled@example.test",
            otp: "123456",
            type: "sign-in",
          }),
          false,
        );
        assert.equal(disabled.status, 404, await disabled.clone().text());
      }
      const untrusted = await runtime.dispatchFetch(
        origin + "/api/auth/sign-out",
        {
          ...json({}),
          headers: {
            origin: "https://untrusted.example.test",
            cookie,
            "content-type": "application/json",
          },
        },
      );

      assert.equal(untrusted.status, 403);
    },
  );

  await check(
    "billing events are signed, idempotent, ordered and atomic; calls stay disabled",
    async () => {
      const { verifyBilling } = await import("./billing.mjs");
      await verifyBilling({
        request,
        json,
        database,
        workspace,
        structure,
        memberCookie: authorizationMemberCookie,
        stripeSubscriptions,
      });
    },
  );

  await check(
    "multipart uploads preserve their body through Worker and Durable Object routing",
    async () => {
      const form = new FormData();

      form.set(
        "file",
        new File(["image-body"], "avatar.png", { type: "image/png" }),
      );
      const uploaded = await request(`/parties/user/${user.id}/avatar`, {
        method: "POST",
        body: form,
      });

      assert.equal(uploaded.status, 200, await uploaded.clone().text());
      const { key } = await uploaded.json();

      assert.equal(typeof key, "string");
      const saved = await request(`/api/users/${user.id}/avatar`, {
        method: "POST",
        headers: { key },
      });

      assert.equal(saved.status, 200, await saved.text());
      const profile = await (await request("/api/users/me")).json();

      assert.equal(profile.avatar, `https://avatars.example.test/usr_${key}`);
    },
  );

  await check(
    "partial configuration keeps collaboration available with OAuth configured and other providers absent",
    async () => {
      const {
        APP_DOMAIN,
        BACKEND_DOMAIN,
        AVATARS_URL,
        BETTER_AUTH_SECRET,
        SECRET_KEY,
        GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET,
        GITHUB_CLIENT_ID,
        GITHUB_CLIENT_SECRET,
      } = runtimeOptions.bindings;
      await runtime.setOptions(
        convertV4MiniflareOptions({
          ...runtimeOptions,
          bindings: {
            APP_DOMAIN,
            BACKEND_DOMAIN,
            AVATARS_URL,
            BETTER_AUTH_SECRET,
            SECRET_KEY,
            GOOGLE_CLIENT_ID,
            GOOGLE_CLIENT_SECRET,
            GITHUB_CLIENT_ID,
            GITHUB_CLIENT_SECRET,
          },
          outboundService: async () => {
            throw new Error(
              "Unconfigured integration attempted network access",
            );
          },
        }),
      );
      try {
        assert.equal((await request("/health")).status, 200);
        assert.equal((await request("/api/users/me", {}, false)).status, 401);
        assert.equal((await request("/api/users/me")).status, 200);
        const response = await request(
          "/api/workspaces/new",
          json({ name: "Without storage", slug: "without-storage" }),
        );
        assert.equal(response.status, 201, await response.clone().text());
        const created = (await response.json()).workspace;
        assert.equal(
          (await request(`/api/workspaces/${created.id}/members`)).status,
          200,
        );
        // Earlier authentication checks share a rate-limit bucket in this local runtime.
        const partialDatabase = await runtime.getD1Database("DB");
        await partialDatabase.prepare("DELETE FROM auth_rate_limits").run();
        const otp = await request(
          "/api/auth/email-otp/send-verification-otp",
          json({ email: "unconfigured@example.test", type: "sign-in" }),
          false,
        );
        assert.equal(otp.status, 404, await otp.clone().text());
        const webhook = await request("/api/billing/webhook", {
          ...json({}),
          headers: {
            "content-type": "application/json",
            "stripe-signature": "unconfigured",
          },
        });
        assert.equal(webhook.status, 503, await webhook.clone().text());
      } finally {
        await runtime.setOptions(convertV4MiniflareOptions(runtimeOptions));
      }
    },
  );

  await check(
    "logout revokes the session and previously issued connection tickets",
    async () => {
      const response = await request("/api/auth/sign-out", json({}));

      assert.equal(response.status, 200, await response.clone().text());
      assert.equal((await request("/api/users/me")).status, 401);
      assert.equal(
        (
          await request(
            `/parties/user/${user.id}?token=${ticket}`,
            { headers: { upgrade: "websocket" } },
            false,
          )
        ).status,
        401,
      );
    },
  );
} finally {
  await runtime?.dispose();
  await rm(output, { recursive: true, force: true });
}

if (failures.length) {
  throw new Error(
    `${failures.length} production runtime checks failed: ${failures.join(", ")}`,
  );
}

import assert from "node:assert/strict";
import { realpathSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

/** @param {string} root */
export function loadYjsProtocol(root) {
  const require = createRequire(
    realpathSync(
      path.join(root, "apps/backend/node_modules/y-partyserver/package.json"),
    ),
  );
  const Y = require("yjs");
  const encoding = require("lib0/encoding");
  const decoding = require("lib0/decoding");
  const sync = require("y-protocols/sync");
  return { Y, encoding, decoding, sync };
}

/** @param {any} fixture */
export async function verifyCollaboration({
  root,
  request,
  json,
  database,
  workspace,
  structure,
  emails,
  restart,
}) {
  const { Y, encoding, decoding, sync } = loadYjsProtocol(root);
  const team = structure.teams[0];
  const folder = team.folders[0];
  const page = folder.channels[0];
  const target = new URLSearchParams({
    workspaceId: workspace.id,
    teamId: team.id,
    folderId: folder.id,
  });
  const pathName = `/parties/page/${page.id}?${target}`;

  const authorizationRoot = `/api/workspaces/${workspace.id}/authorization`;
  const existing = await (await request(authorizationRoot + "/roles")).json();
  for (const assignment of existing.assignments.filter(
    (/** @type {{id:string,scope:{type:string,id:string}}} */ a) =>
      a.scope.type === "page" && a.scope.id === page.id,
  )) {
    assert.equal(
      (
        await request(authorizationRoot + "/assignments/" + assignment.id, {
          method: "DELETE",
        })
      ).status,
      204,
    );
  }
  const created = await request(
    authorizationRoot + "/roles",
    json({ name: "Live page access", permissions: { page: ["read"] } }),
  );
  assert.equal(created.status, 201, await created.clone().text());
  const pageRole = await created.json();
  async function assignPageRole() {
    const response = await request(
      authorizationRoot + "/assignments",
      json({
        roleId: pageRole.id,
        subject: { type: "team", id: team.id },
        scope: { type: "page", id: page.id },
      }),
    );
    assert.equal(response.status, 201, await response.clone().text());
    return response.json();
  }
  let pageAssignment = await assignPageRole();

  const a = await request(pathName, { headers: { upgrade: "websocket" } });
  const b = await request(pathName, { headers: { upgrade: "websocket" } });

  assert.equal(a.status, 101);
  assert.equal(b.status, 101);
  const first = a.webSocket,
    second = b.webSocket;

  first.accept();
  second.accept();
  const source = new Y.Doc();
  const destination = new Y.Doc();

  source.getText("runtime").insert(0, "persisted collaboration");

  /** @param {any} socket @param {any} doc */
  function sendUpdate(socket, doc) {
    const encoder = encoding.createEncoder();

    encoding.writeVarUint(encoder, 0);
    sync.writeUpdate(encoder, Y.encodeStateAsUpdate(doc));
    socket.send(encoding.toUint8Array(encoder));
  }

  const synchronized = new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("Yjs synchronization timed out")),
      5000,
    );

    second.addEventListener("message", (/** @type {any} */ event) => {
      if (typeof event.data === "string") {
        return;
      }

      const decoder = decoding.createDecoder(new Uint8Array(event.data));
      const encoder = encoding.createEncoder();

      if (decoding.readVarUint(decoder) !== 0) {
        return;
      }

      sync.readSyncMessage(decoder, encoder, destination, null);

      if (
        destination.getText("runtime").toString() === "persisted collaboration"
      ) {
        clearTimeout(timeout);
        resolve(undefined);
      }
    });
  });

  sendUpdate(first, source);

  await synchronized;
  await database
    .prepare("UPDATE feature_flags SET enabled=0 WHERE key='pages'")
    .run();
  const disabledEdit = new Y.Doc();
  try {
    const blocked = await request(pathName, {
      headers: { upgrade: "websocket" },
    });
    assert.equal(blocked.status, 403);
    disabledEdit.getText("blocked-by-flag").insert(0, "must not persist");
    sendUpdate(first, disabledEdit);
    await new Promise((resolve) => setTimeout(resolve, 100));
    assert.equal(destination.getText("blocked-by-flag").toString(), "");
  } finally {
    await database
      .prepare("UPDATE feature_flags SET enabled=1 WHERE key='pages'")
      .run();
    disabledEdit.destroy();
  }
  first.close();
  second.close();

  const sent = await request(
    "/api/auth/email-otp/send-verification-otp",
    json({ email: "viewer@example.test", type: "sign-in" }),
  );

  assert.equal(sent.status, 200, await sent.text());
  const signedIn = await request(
    "/api/auth/sign-in/email-otp",
    json({
      email: "viewer@example.test",
      otp: emails.get("viewer@example.test"),
    }),
  );

  assert.equal(signedIn.status, 200, await signedIn.clone().text());
  const viewerCookie = signedIn.headers
    .getSetCookie()
    .map((/** @type {string} */ value) => value.split(";")[0])
    .join("; ");
  const viewerHeaders = { cookie: viewerCookie };

  assert.equal(
    (await request("/api/users/me", { headers: viewerHeaders })).status,
    200,
  );
  const invite = await database
    .prepare("SELECT token FROM invites WHERE workspace_id = ?")
    .bind(workspace.id)
    .first();
  const joined = await request(
    `/api/workspaces/${workspace.id}/join/${invite.token}`,
    { method: "POST", headers: viewerHeaders },
  );

  assert.equal(joined.status, 200, await joined.text());
  const deniedAdmin = await request(`/api/workspaces/${workspace.id}/invite`, {
    headers: viewerHeaders,
  });

  assert.equal(deniedAdmin.status, 403);

  const deniedUpdate = await request(`/api/workspaces/${workspace.id}/update`, {
    ...json({ name: "Forged update", slug: "forged-update" }),
    headers: {
      ...viewerHeaders,
      "content-type": "application/json",
      "x-owner": "true",
    },
  });

  assert.equal(deniedUpdate.status, 403);
  assert.equal(
    (await request(`/api/workspaces/${workspace.id}/leave`, { method: "POST" }))
      .status,
    409,
  );
  assert.equal(
    (
      await request(`/parties/workspace/${workspace.id}/leave`, {
        method: "POST",
      })
    ).status,
    404,
  );

  const candidates = await request(
    authorizationRoot + "/pages/" + page.id + "/members",
    { headers: viewerHeaders },
  );
  assert.equal(candidates.status, 200, await candidates.clone().text());
  assert.ok((await candidates.json()).length >= 2);

  // A thread reader can synchronize but cannot write, including through direct object ingress.
  const thread = team.threads[0];
  for (const assignment of existing.assignments.filter(
    (/** @type {{id:string,scope:{type:string,id:string}}} */ item) =>
      item.scope.type === "thread" && item.scope.id === thread.id,
  ))
    assert.equal(
      (
        await request(authorizationRoot + "/assignments/" + assignment.id, {
          method: "DELETE",
        })
      ).status,
      204,
    );
  const threadRoleResponse = await request(
    authorizationRoot + "/roles",
    json({ name: "Live thread access", permissions: { thread: ["read"] } }),
  );
  assert.equal(threadRoleResponse.status, 201);
  const threadRole = await threadRoleResponse.json();
  assert.equal(
    (
      await request(
        authorizationRoot + "/assignments",
        json({
          roleId: threadRole.id,
          subject: { type: "team", id: team.id },
          scope: { type: "thread", id: thread.id },
        }),
      )
    ).status,
    201,
  );
  const viewerIdentity = await database
    .prepare("SELECT id FROM auth_users WHERE email = ?")
    .bind("viewer@example.test")
    .first();
  const threadHeaders = {
    ...viewerHeaders,
    "content-type": "application/json",
    "x-workspace-id": workspace.id,
    "x-team-id": team.id,
  };
  const threadPath = `/parties/thread/${thread.id}`;
  /** @param {number} id */
  async function writeThread(id) {
    return request(threadPath + "/replicache-push", {
      ...json({
        clientGroupID: "role-thread",
        mutations: [
          {
            id,
            clientID: "role-thread",
            name: "createPost",
            args: {
              id: "role-thread-post",
              author: viewerIdentity.id,
              content: "Permission checked",
              type: "qa",
              createdAt: new Date().toISOString(),
            },
          },
        ],
      }),
      headers: threadHeaders,
    });
  }
  async function readThread() {
    const response = await request(threadPath + "/replicache-pull", {
      ...json({ clientGroupID: "role-thread", cookie: null }),
      headers: threadHeaders,
    });
    assert.equal(response.status, 200);
    return JSON.stringify(await response.json());
  }
  assert.equal((await writeThread(1)).status, 200);
  assert.ok(!(await readThread()).includes("role-thread-post"));
  assert.equal(
    (
      await request(authorizationRoot + "/roles/" + threadRole.id, {
        ...json({
          name: "Live thread access",
          permissions: { thread: ["read", "update"] },
        }),
        method: "PATCH",
      })
    ).status,
    200,
  );
  assert.equal((await writeThread(2)).status, 200);
  assert.ok((await readThread()).includes("role-thread-post"));

  const viewer = await request(pathName, {
    headers: {
      ...viewerHeaders,
      upgrade: "websocket",
      "x-can-edit": "true",
      "x-owner": "true",
    },
  });

  assert.equal(viewer.status, 101);
  const reader = viewer.webSocket;

  reader.accept();
  const malicious = new Y.Doc();

  malicious.getText("runtime").insert(0, "unauthorized edit");
  sendUpdate(reader, malicious);

  // Keep the same viewer socket open while grants change, then restart before the debounce expires.
  const live = await request(pathName, { headers: { upgrade: "websocket" } });
  assert.equal(live.status, 101);
  const editor = live.webSocket;
  editor.accept();
  const observed = new Y.Doc();
  /** @param {string} field @param {string} expected */
  function waitForField(field, expected) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error(`Live Yjs update timed out: ${field}`)),
        5000,
      );
      const listener = (
        /** @type {{ data: ArrayBuffer | string }} */ event,
      ) => {
        if (typeof event.data === "string") return;
        const decoder = decoding.createDecoder(new Uint8Array(event.data));
        if (decoding.readVarUint(decoder) !== 0) return;
        sync.readSyncMessage(decoder, encoding.createEncoder(), observed, null);
        if (observed.getText(field).toString() === expected) {
          clearTimeout(timeout);
          editor.removeEventListener("message", listener);
          resolve(undefined);
        }
      };
      editor.addEventListener("message", listener);
    });
  }
  /** @param {boolean} canEdit @param {boolean} [canView] */
  async function changeAccess(canEdit, canView = true) {
    if (!canView) {
      const response = await request(
        authorizationRoot + "/assignments/" + pageAssignment.id,
        { method: "DELETE" },
      );
      assert.equal(response.status, 204);
      pageAssignment = null;
      return;
    }
    const response = await request(
      authorizationRoot + "/roles/" + pageRole.id,
      {
        ...json({
          name: "Live page access",
          permissions: { page: canEdit ? ["read", "update"] : ["read"] },
        }),
        method: "PATCH",
      },
    );
    assert.equal(response.status, 200, await response.text());
    if (!pageAssignment) pageAssignment = await assignPageRole();
  }
  // Exercise threshold compaction, then leave a fresh update for journal recovery.
  const continuous = new Y.Doc();
  for (let index = 0; index < 66; index++) {
    const received = waitForField("continuous", String(index));
    continuous.getMap("counter").set("value", index);
    const text = continuous.getText("continuous");
    text.delete(0, text.length);
    text.insert(0, String(index));
    sendUpdate(editor, continuous);
    await received;
  }
  continuous.destroy();
  await changeAccess(true);
  const granted = new Y.Doc();
  granted.getText("granted-live").insert(0, "allowed while editor");
  let received = waitForField("granted-live", "allowed while editor");
  sendUpdate(reader, granted);
  await received;
  await changeAccess(false);
  const revoked = new Y.Doc();
  revoked.getText("revoked-live").insert(0, "must not persist");
  sendUpdate(reader, revoked);
  // Wait for the rejected update to traverse the local websocket boundary.
  await new Promise((resolve) => setTimeout(resolve, 100));
  const closed = new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("Revoked viewer was not disconnected")),
      5000,
    );
    reader.addEventListener(
      "close",
      (/** @type {{ code: number }} */ event) => {
        clearTimeout(timeout);
        assert.equal(event.code, 1008);
        resolve(undefined);
      },
    );
  });
  await changeAccess(false, false);
  const pending = new Y.Doc();
  pending.getText("pending-save").insert(0, "durable before debounce");
  received = waitForField("pending-save", "durable before debounce");
  sendUpdate(editor, pending);
  await received;
  await closed;
  assert.equal(observed.getText("revoked-live").toString(), "");
  const deniedReconnect = await request(pathName, {
    headers: { ...viewerHeaders, upgrade: "websocket" },
  });
  assert.equal(deniedReconnect.status, 403);
  await changeAccess(false);
  editor.close();
  observed.destroy();
  granted.destroy();
  revoked.destroy();
  pending.destroy();
  await restart();
  const reconnect = await request(pathName, {
    headers: { upgrade: "websocket" },
  });

  assert.equal(reconnect.status, 101);
  const socket = reconnect.webSocket;
  const restored = new Y.Doc();
  const restoredState = new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("Yjs restore timed out")),
      5000,
    );

    socket.addEventListener("message", (/** @type {any} */ event) => {
      if (typeof event.data === "string") {
        return;
      }

      const decoder = decoding.createDecoder(new Uint8Array(event.data));
      const encoder = encoding.createEncoder();

      if (decoding.readVarUint(decoder) !== 0) {
        return;
      }

      sync.readSyncMessage(decoder, encoder, restored, null);

      if (restored.getText("runtime").toString()) {
        clearTimeout(timeout);
        resolve(undefined);
      }
    });
  });

  socket.accept();
  const encoder = encoding.createEncoder();

  encoding.writeVarUint(encoder, 0);
  sync.writeSyncStep1(encoder, restored);
  socket.send(encoding.toUint8Array(encoder));

  await restoredState;
  assert.equal(
    restored.getText("runtime").toString(),
    "persisted collaboration",
  );
  assert.equal(restored.getText("blocked-by-flag").toString(), "");
  assert.equal(
    restored.getText("pending-save").toString(),
    "durable before debounce",
  );
  assert.equal(
    restored.getText("granted-live").toString(),
    "allowed while editor",
  );
  assert.equal(restored.getText("revoked-live").toString(), "");
  assert.equal(restored.getText("continuous").toString(), "65");
  socket.close();
  source.destroy();
  destination.destroy();
  malicious.destroy();
  restored.destroy();
  return { viewerCookie };
}

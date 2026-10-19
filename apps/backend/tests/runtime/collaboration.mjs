import assert from "node:assert/strict";
import { realpathSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

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
  const require = createRequire(
    realpathSync(
      path.join(root, "apps/backend/node_modules/y-partyserver/package.json"),
    ),
  );
  const Y = require("yjs");
  const encoding = require("lib0/encoding");
  const decoding = require("lib0/decoding");
  const sync = require("y-protocols/sync");
  const team = structure.teams[0];
  const folder = team.folders[0];
  const page = folder.channels[0];
  const target = new URLSearchParams({
    workspaceId: workspace.id,
    teamId: team.id,
    folderId: folder.id,
  });
  const pathName = `/parties/page/${page.id}?${target}`;

  const changed = await request("/api/replicache/push", {
    ...json({
      clientGroupID: "runtime-editor",
      pushVersion: 1,
      schemaVersion: "",
      mutations: [
        {
          id: 1,
          clientID: "runtime-editor",
          name: "updatePage",
          args: {
            ...page,
            teamId: team.id,
            folderId: folder.id,
            editGroups: [],
            viewGroups: ["team-members"],
          },
        },
      ],
    }),
    headers: {
      "content-type": "application/json",
      domain: "workspace",
      id: workspace.id,
    },
  });

  assert.equal(changed.status, 200, await changed.text());

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
  reader.close();

  // Wait for YServer's configured persistence debounce, then verify a new connection sees the authoritative snapshot.

  await new Promise((resolve) => setTimeout(resolve, 2300));
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
  socket.close();
  source.destroy();
  destination.destroy();
  malicious.destroy();
  restored.destroy();
  return { viewerCookie };
}

import { loadYjsProtocol } from "./collaboration.mjs";
import assert from "node:assert/strict";

/** @param {any} fixture */
export async function verifyStructuralPersistence({
  root,
  request,
  json,
  workspace,
  structure,
  restart,
}) {
  const team = structure.teams[0];
  const folder = team.folders[0];
  const page = folder.channels[0];
  const targets = {
    page: page.id,
    room: team.rooms[0].id,
    thread: team.threads[0].id,
  };
  const headers = {
    "content-type": "application/json",
    "x-workspace-id": workspace.id,
    "x-team-id": team.id,
    "x-folder-id": folder.id,
  };
  /** @param {keyof targets} kind @param {any[]} mutations */
  async function push(kind, mutations) {
    const response = await request(
      `/parties/${kind}/${targets[kind]}/replicache-push`,
      {
        ...json({
          clientGroupID: `sql-${kind}`,
          mutations: mutations.map((mutation, index) => ({
            id: index + 1,
            clientID: `sql-${kind}`,
            ...mutation,
          })),
        }),
        headers,
      },
    );
    assert.equal(response.status, 200, await response.text());
  }
  /** @param {keyof targets} kind */
  async function pull(kind) {
    const response = await request(
      `/parties/${kind}/${targets[kind]}/replicache-pull`,
      {
        ...json({ clientGroupID: `sql-${kind}`, cookie: null }),
        headers,
      },
    );
    assert.equal(response.status, 200, await response.clone().text());
    const body = /** @type {import("replicache").PullResponseV1} */ (
      await response.json()
    );
    assert.ok("patch" in body);
    return body;
  }
  const now = new Date().toISOString();
  const roomCommands = [
    {
      name: "sendMessage",
      args: {
        id: "sql-poll",
        sender: workspace.owner,
        content: "Pick one",
        type: "poll",
        date: now,
        pollOptions: ["First", "Second"],
      },
    },
    { name: "vote", args: { msgId: "sql-poll", option: 1 } },
    {
      name: "sendMessage",
      args: {
        id: "sql-text",
        sender: workspace.owner,
        content: "After poll",
        date: now,
      },
    },
  ];
  const threadCommands = [
    {
      name: "createPost",
      args: {
        id: "sql-post",
        author: workspace.owner,
        content: "Question",
        type: "poll",
        createdAt: now,
        pollOptions: ["Yes", "No"],
      },
    },
    {
      name: "createComment",
      args: {
        postId: "sql-post",
        id: "sql-comment",
        author: workspace.owner,
        content: "Reply",
        createdAt: now,
        type: "message",
      },
    },
    { name: "vote", args: { postId: "sql-post", option: 0 } },
  ];
  const pageCommands = [
    { name: "createColumn", args: { id: "sql-todo", title: "Todo" } },
    { name: "createColumn", args: { id: "sql-done", title: "Done" } },
    {
      name: "createTask",
      args: {
        col: "sql-todo",
        task: {
          id: "sql-task",
          columnId: "sql-todo",
          title: "Retained task",
          assignee: [workspace.owner],
          priority: "high",
        },
      },
    },
    {
      name: "moveTasks",
      args: { t1: "sql-task", tOrC2: "sql-done", isOverColumn: true },
    },
    { name: "moveColumns", args: { c1: "sql-todo", c2: "sql-done" } },
  ];
  await push("room", roomCommands);
  await push("thread", threadCommands);
  await push("page", pageCommands);
  const before = {
    room: await pull("room"),
    thread: await pull("thread"),
    page: await pull("page"),
  };
  /** @param {import("replicache").PullResponseOKV1} snapshot @param {string} key */
  function value(snapshot, key) {
    const patch = snapshot.patch.find(
      (patch) => patch.op === "put" && patch.key === key,
    );
    return patch?.op === "put" ? patch.value : undefined;
  }
  const messages =
    /** @type {import("@wodge/domain/rooms/models").Message[]} */ (
      value(before.room, "messages")
    );
  const posts =
    /** @type {import("@wodge/domain/discussions/models").ThreadPost[]} */ (
      value(before.thread, "posts")
    );
  const tasks = /** @type {import("@wodge/domain/pages/models").Task[]} */ (
    value(before.page, "tasks")
  );
  assert.deepEqual(
    messages.map((message) => message.id),
    ["sql-poll", "sql-text"],
  );
  assert.equal(
    messages.find((message) => message.id === "sql-poll")?.pollVoters[0]
      ?.option,
    1,
  );
  assert.equal(posts[0]?.comments[0]?.content, "Reply");
  assert.equal(posts[0]?.pollVoters[0]?.option, 0);
  assert.equal(tasks[0]?.columnId, "sql-done");
  const kinds = /** @type {const} */ (["room", "thread", "page"]);
  // Removing both editor view nodes must leave the page-owned SQL task collection intact.
  const { Y, encoding, decoding, sync } = loadYjsProtocol(root);
  const connection = await request(
    `/parties/page/${page.id}?${new URLSearchParams({ workspaceId: workspace.id, teamId: team.id, folderId: folder.id })}`,
    { headers: { upgrade: "websocket" } },
  );
  assert.equal(connection.status, 101);
  const socket = connection.webSocket;
  socket.accept();
  const document = new Y.Doc();
  const observer = new Y.Doc();
  const views = document.getXmlFragment("default");
  const table = new Y.XmlElement("tasks-db");
  const kanban = new Y.XmlElement("tasks-db");
  table.setAttribute("data-id", "table-view");
  kanban.setAttribute("data-id", "kanban-view");
  views.insert(0, [table, kanban]);
  /** @param {number} expected */
  async function saveViews(expected) {
    const received = new Promise((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error("Task view document sync timed out")),
        5000,
      );
      const listener = (
        /** @type {{ data: string | ArrayBuffer }} */ event,
      ) => {
        if (typeof event.data === "string") return;
        const decoder = decoding.createDecoder(new Uint8Array(event.data));
        if (decoding.readVarUint(decoder) !== 0) return;
        sync.readSyncMessage(decoder, encoding.createEncoder(), observer, null);
        if (observer.getXmlFragment("default").length === expected) {
          clearTimeout(timeout);
          socket.removeEventListener("message", listener);
          resolve(undefined);
        }
      };
      socket.addEventListener("message", listener);
    });
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, 0);
    sync.writeUpdate(encoder, Y.encodeStateAsUpdate(document));
    socket.send(encoding.toUint8Array(encoder));
    await received;
  }
  await saveViews(2);
  views.delete(0, 2);
  await saveViews(0);
  assert.deepEqual(await pull("page"), before.page);
  socket.close();
  document.destroy();
  observer.destroy();
  const workspaces = await (await request("/api/users/workspaces")).json();
  const members = await (
    await request(`/api/workspaces/${workspace.id}/members`)
  ).json();
  await restart();
  for (const kind of kinds) assert.deepEqual(await pull(kind), before[kind]);
  assert.deepEqual(
    await (await request("/api/users/workspaces")).json(),
    workspaces,
  );
  assert.deepEqual(
    await (await request(`/api/workspaces/${workspace.id}/members`)).json(),
    members,
  );
  // Retries after a cold start must preserve acknowledgements and avoid duplicate entities.
  await push("room", roomCommands);
  await push("thread", threadCommands);
  await push("page", pageCommands);
  for (const kind of kinds) {
    const replayed = await pull(kind);
    assert.deepEqual(replayed.patch, before[kind].patch);
    assert.deepEqual(
      replayed.lastMutationIDChanges,
      before[kind].lastMutationIDChanges,
    );
  }
}

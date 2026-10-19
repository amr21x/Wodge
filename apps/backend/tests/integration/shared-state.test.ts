// @vitest-environment jsdom

import { ThreadPostSchema } from "@wodge/domain/discussions/validation";
import { MessageSchema } from "@wodge/domain/rooms/validation";
import { makeWorkspaceStructureKey } from "@wodge/domain/sync/index";
import { IDBKeyRange, indexedDB } from "fake-indexeddb";
import {
  Replicache,
  TEST_LICENSE_KEY,
  type MutatorDefs,
  type WriteTransaction,
} from "replicache";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { queryClient } from "../../../web/src/client/query";
import { createThreadMutators } from "../../../web/src/client/sync/discussions/mutators";
import { createRoomMutators } from "../../../web/src/client/sync/rooms/mutators";
import { createWorkspaceMutators } from "../../../web/src/client/sync/workspace/mutators";
import type { RunnerParams } from "../../src/lib/sync/replicache";
import type RoomParty from "../../src/servers/room";
import type ThreadParty from "../../src/servers/thread";
import type WorkspaceParty from "../../src/servers/workspace";
import {
  executeDiscussionMutation,
  executeRoomMutation,
  executeWorkspaceMutation,
} from "../helpers/mutations";

const actor = {
  userId: "owner",
  isOwner: false,
  isAdmin: false,
  isTeamModerator: false,
  canEdit: true,
  canView: true,
};

const clients: { close(): Promise<void> }[] = [];

beforeEach(() => {
  vi.stubGlobal("indexedDB", indexedDB);
  vi.stubGlobal("IDBKeyRange", IDBKeyRange);
  vi.setSystemTime(new Date("2026-10-16T00:00:00.000Z"));
  queryClient.setQueryData(["user"], { id: "owner" });
});

afterEach(async () => {
  await Promise.all(clients.splice(0).map((client) => client.close()));
  queryClient.clear();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function client<M extends MutatorDefs>(mutators: M) {
  const instance = new Replicache({
    name: crypto.randomUUID(),
    mutators,
    licenseKey: TEST_LICENSE_KEY,
    pullInterval: null,
    logLevel: "error",
  });

  clients.push(instance);

  return instance;
}

function params(name: string, args: unknown): RunnerParams {
  return {
    mutation: { id: 1, clientID: "client", name, args },
    nextVersion: 1,
    userId: "owner",
  };
}

function storage() {
  const records = new Map<string, unknown>();

  return {
    records,
    get: vi.fn(async (key: string) => structuredClone(records.get(key))),
    put: vi.fn(async (key: string, value: unknown) => {
      records.set(key, structuredClone(value));
    }),
  };
}

test("workspace optimism uses its bound actor identity and backend authorization still gates writes", async () => {
  const state = { teams: [], groups: [] };
  const instance = client({
    ...createWorkspaceMutators("owner"),
    async seed(tx: WriteTransaction) {
      await tx.set(makeWorkspaceStructureKey(), state);
    },
  });

  await instance.mutate.seed();
  const persisted = storage();
  const party = {
    workspaceStructure: { data: state, lastModifiedVersion: 0, deleted: false },
    workspaceMembers: {
      data: { createdBy: "owner", members: [{ id: "owner", role: "owner" }] },
      lastModifiedVersion: 0,
      deleted: false,
    },
    name: "workspace",
    ctx: { storage: persisted },
    env: {},
  } as unknown as WorkspaceParty;
  const input = { id: "1234567890123456", name: "Team" };

  await instance.mutate.createTeam(input);
  await executeWorkspaceMutation(party, params("createTeam", input), actor);
  expect(
    await instance.query((tx) => tx.get(makeWorkspaceStructureKey())),
  ).toEqual(party.workspaceStructure.data);
  expect(persisted.records.get(makeWorkspaceStructureKey())).toEqual(
    party.workspaceStructure,
  );
  party.workspaceMembers.data.createdBy = "someone-else";
  party.workspaceMembers.data.members = [];

  await executeWorkspaceMutation(
    party,
    params("createTeam", { ...input, id: "abcdefghijklmnop" }),
    actor,
  );
  expect(party.workspaceStructure.data.teams).toHaveLength(1);
  expect(persisted.put).toHaveBeenCalledTimes(1);
});

test("room messages and discussion posts agree across client transactions and backend handlers", async () => {
  const messages = client(createRoomMutators("owner"));
  const posts = client(createThreadMutators("owner"));
  const roomStorage = storage();
  const postStorage = storage();
  const room = {
    messages: { data: [], lastModifiedVersion: 0, deleted: false },
    name: "room",
    ctx: { storage: roomStorage },
    env: {},
  } as unknown as RoomParty;
  const thread = {
    threadPosts: { data: [], lastModifiedVersion: 0, deleted: false },
    name: "fixture",
    ctx: { storage: postStorage },
    env: {},
  } as unknown as ThreadParty;
  const message = MessageSchema.parse({
    id: "message",
    sender: "owner",
    content: "Hello",
    date: new Date().toISOString(),
  });

  await messages.mutate.sendMessage(message);
  await executeRoomMutation(room, params("sendMessage", message), actor);
  expect(await messages.query((tx) => tx.get("messages"))).toEqual(
    room.messages.data,
  );
  const post = ThreadPostSchema.parse({
    id: "post",
    author: "owner",
    content: "Question",
    type: "qa",
    createdAt: new Date().toISOString(),
  });

  await posts.mutate.createPost(post);
  await executeDiscussionMutation(thread, params("createPost", post), actor);
  expect(await posts.query((tx) => tx.get("posts"))).toEqual(
    thread.threadPosts.data,
  );
  expect(roomStorage.records.get("messages")).toEqual(room.messages);
  expect(postStorage.records.get("posts")).toEqual(thread.threadPosts);
});

test("sender impersonation is rejected without persisted client or backend messages", async () => {
  const messages = client(createRoomMutators("owner"));
  const persisted = storage();
  const room = {
    messages: { data: [], lastModifiedVersion: 0, deleted: false },
    name: "room",
    ctx: { storage: persisted },
    env: {},
  } as unknown as RoomParty;
  const message = MessageSchema.parse({
    id: "message",
    sender: "outsider",
    content: "Hello",
    date: new Date().toISOString(),
  });

  await expect(messages.mutate.sendMessage(message)).rejects.toThrow(
    "Invalid authorId",
  );
  await expect(
    executeRoomMutation(room, params("sendMessage", message), actor),
  ).rejects.toThrow("Invalid authorId");
  expect(await messages.query((tx) => tx.get("messages"))).toBeUndefined();
  expect(room.messages.data).toEqual([]);
  expect(persisted.put).not.toHaveBeenCalled();
});

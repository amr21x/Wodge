import { afterEach, expect, test } from "vitest";
import type { WriteTransaction } from "replicache";
import { queryClient } from "../src/client/query";
import { createRoomMutators } from "../src/client/sync/rooms/mutators";
import { createThreadMutators } from "../src/client/sync/discussions/mutators";
import { createWorkspaceMutators } from "../src/client/sync/workspace/mutators";
import { MessageSchema } from "@wodge/domain/rooms/validation";
import {
  ThreadMessageSchema,
  ThreadPostSchema,
} from "@wodge/domain/discussions/validation";
import { createDefaultTeam } from "@wodge/core/workspace/defaults";
import { createEntityId } from "@wodge/domain/identifiers";
import { makeWorkspaceStructureKey } from "@wodge/domain/sync/index";
import type { WorkspaceStructure } from "@wodge/domain/workspace/models";

function transaction(initial: Record<string, unknown> = {}) {
  const records = new Map(Object.entries(initial));
  // Only the transaction's record API is used by optimistic mutations.
  const tx = {
    async get(key: string) {
      return records.get(key);
    },
    async set(key: string, value: unknown) {
      records.set(key, value);
    },
  } as unknown as WriteTransaction;
  return { tx, records };
}

afterEach(() => queryClient.clear());

test.each([false, true])(
  "room mutations work without a profile cache (other account cached: %s)",
  async (otherCached) => {
    if (otherCached) {
      queryClient.setQueryData(["user"], { id: "bob" });
      queryClient.setQueryData(["user", "bob"], { id: "bob" });
    }
    const { tx, records } = transaction();
    const mutations = createRoomMutators("alice");
    const message = MessageSchema.parse({
      id: "message",
      sender: "alice",
      content: "Hello",
      date: new Date().toISOString(),
      type: "poll",
      pollOptions: ["Yes", "No"],
    });
    await mutations.sendMessage(tx, message);
    await mutations.editMessage(tx, { message, newContent: "Updated" });
    expect(records.get("messages")).toMatchObject([
      { sender: "alice", content: "Updated" },
    ]);
    await mutations.vote(tx, { msgId: message.id, option: 0 });
    expect(records.get("messages")).toMatchObject([
      { pollVoters: [{ voter: "alice", option: 0 }] },
    ]);
    await mutations.removeVote(tx, { msgId: message.id, option: 0 });
    expect(records.get("messages")).toMatchObject([{ pollVoters: [] }]);
    await mutations.deleteMessage(tx, message);
    expect(records.get("messages")).toEqual([]);
  },
);

test("discussion mutations use their replica identity across profile cache changes", async () => {
  const { tx, records } = transaction();
  const mutations = createThreadMutators("alice");
  const post = ThreadPostSchema.parse({
    id: "post",
    author: "alice",
    content: "Question",
    type: "poll",
    createdAt: new Date().toISOString(),
    pollOptions: ["Yes", "No"],
    votes: [0, 0],
  });
  const comment = ThreadMessageSchema.parse({
    id: "comment",
    author: "alice",
    content: "Reply",
    type: "message",
    createdAt: new Date().toISOString(),
  });
  await mutations.createPost(tx, post);
  queryClient.setQueryData(["user", "bob"], { id: "bob" });
  await mutations.editPost(tx, { ...post, newContent: "Updated question" });
  await mutations.createComment(tx, { ...comment, postId: post.id });
  await mutations.editComment(tx, {
    comment,
    postId: post.id,
    newContent: "Updated reply",
  });
  expect(records.get("posts")).toMatchObject([
    {
      content: "Updated question",
      comments: [{ author: "alice", content: "Updated reply" }],
    },
  ]);
  await mutations.deleteComment(tx, { ...comment, postId: post.id });
  await mutations.vote(tx, { postId: post.id, option: 0 });
  expect(records.get("posts")).toMatchObject([
    { pollVoters: [{ voter: "alice", option: 0 }] },
  ]);
  queryClient.clear();
  await mutations.removeVote(tx, { postId: post.id, option: 0 });
  await mutations.togglePost(tx, post.id);
  expect(records.get("posts")).toMatchObject([
    { isResolved: true, comments: [], pollVoters: [] },
  ]);
  await mutations.deletePost(tx, post);
  expect(records.get("posts")).toEqual([]);
});

test("workspace mutations use the replica owner without a cached user", async () => {
  const team = createDefaultTeam("alice");
  const key = makeWorkspaceStructureKey();
  const { tx, records } = transaction({ [key]: { teams: [team], groups: [] } });
  const mutations = createWorkspaceMutators("alice");
  await mutations.createTeam(tx, {
    id: createEntityId(),
    name: "New team",
    avatar: "",
  });
  await mutations.createGroup(tx, {
    id: createEntityId(),
    name: "New group",
    color: "#112233",
  });
  const thread = { ...team.threads[0]!, id: createEntityId() };
  await mutations.createThread(tx, { ...thread, teamId: team.id });
  await mutations.updateThread(tx, {
    ...thread,
    name: "Renamed",
    teamId: team.id,
  });
  const structure = records.get(key) as WorkspaceStructure;
  expect(structure.teams[1]).toMatchObject({
    createdBy: "alice",
    members: ["alice"],
  });
  expect(structure.groups[0]).toMatchObject({ createdBy: "alice" });
  expect(structure.teams[0]!.threads).toContainEqual({
    ...thread,
    name: "Renamed",
  });
  await mutations.deleteChannel(tx, {
    channelId: thread.id,
    teamId: team.id,
    type: "thread",
  });
  expect(
    (records.get(key) as WorkspaceStructure).teams[0]!.threads,
  ).not.toContainEqual(expect.objectContaining({ id: thread.id }));
});

test("replicas for different accounts retain their own author identity", async () => {
  const { tx, records } = transaction();
  const alice = createRoomMutators("alice");
  const bob = createRoomMutators("bob");
  for (const [sender, mutations] of [
    ["alice", alice],
    ["bob", bob],
  ] as const) {
    await mutations.sendMessage(
      tx,
      MessageSchema.parse({
        id: sender,
        sender,
        content: "Hello",
        date: new Date().toISOString(),
      }),
    );
  }
  expect(records.get("messages")).toMatchObject([
    { sender: "alice" },
    { sender: "bob" },
  ]);
  await expect(
    bob.sendMessage(
      tx,
      MessageSchema.parse({
        id: "forged",
        sender: "alice",
        content: "Forged",
        date: new Date().toISOString(),
      }),
    ),
  ).rejects.toMatchObject({ code: "ROOM_FORBIDDEN" });
});

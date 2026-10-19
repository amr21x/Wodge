import { expect, test } from "vitest";
import { pageInputSchemas, TaskSchema } from "@wodge/domain/pages/validation";
import type { PageInputs } from "@wodge/domain/pages/dto";
import {
  roomInputSchemas,
  MessageSchema,
} from "@wodge/domain/rooms/validation";
import type { RoomInputs } from "@wodge/domain/rooms/dto";
import {
  discussionInputSchemas,
  ThreadPostSchema,
  ThreadMessageSchema,
} from "@wodge/domain/discussions/validation";
import type { DiscussionInputs } from "@wodge/domain/discussions/dto";
import { workspaceInputSchemas } from "@wodge/domain/workspace/validation";
import type { WorkspaceInputs } from "@wodge/domain/workspace/dto";
import { UpdateUserSchema } from "@wodge/domain/user/validation";

const id = "1234567890123456";

const task = TaskSchema.parse({
  id: "task",
  columnId: "column",
  title: "Task",
});

const message = MessageSchema.parse({
  id: "message",
  sender: "owner",
  content: "Hello",
  date: "2026-10-16T00:00:00Z",
});

const post = ThreadPostSchema.parse({
  id: "post",
  author: "owner",
  content: "Hello",
  type: "qa",
  createdAt: "2026-10-16T00:00:00Z",
});

const comment = ThreadMessageSchema.parse({
  id: "comment",
  author: "owner",
  content: "Reply",
  type: "message",
  createdAt: "2026-10-16T00:00:00Z",
});

const page = {
  id: "123456789012345678901",
  name: "Page",
  viewGroups: [],
  editGroups: [],
  teamId: id,
  folderId: id,
};

const room = {
  id: "123456789012345678901",
  name: "Room",
  viewGroups: [],
  editGroups: [],
  teamId: id,
};

const folder = { id, name: "Folder", channels: [], teamId: id };

const pages = {
  createColumn: { id: "column", title: "Column" },
  deleteColumn: { id: "column" },
  updateColumn: { id: "column", title: "New" },
  createTask: { task, col: "column" },
  editTask: { task },
  deleteTask: { task },
  moveColumns: { c1: "a", c2: "b" },
  moveTasks: { t1: "task", tOrC2: "column", isOverColumn: true },
} satisfies PageInputs;

const rooms = {
  sendMessage: message,
  editMessage: { message, newContent: "Edited" },
  deleteMessage: message,
  vote: { msgId: "message", option: 0 },
  removeVote: { msgId: "message", option: 0 },
} satisfies RoomInputs;

const discussions = {
  createPost: post,
  editPost: { ...post, newContent: "Edited" },
  deletePost: post,
  togglePost: "post",
  createComment: { ...comment, postId: "post" },
  deleteComment: { ...comment, postId: "post" },
  editComment: { comment, newContent: "Edited", postId: "post" },
  vote: { postId: "post", option: 0 },
  removeVote: { postId: "post", option: 0 },
} satisfies DiscussionInputs;

const workspace = {
  createTeam: { id, name: "Team" },
  deleteTeam: id,
  updateTeam: {
    teamId: id,
    teamUpdate: { action: "addMembers", update: { members: ["owner"] } },
  },
  createGroup: { id, name: "Group", color: "blue" },
  updateGroup: {
    groupId: id,
    groupUpdate: { action: "removeMembers", update: { members: ["owner"] } },
  },
  deleteGroup: id,
  createPage: page,
  updatePage: page,
  createRoom: room,
  updateRoom: room,
  createThread: room,
  updateThread: room,
  updateFolder: folder,
  deleteFolder: { teamId: id, folderId: id },
  deleteChannel: { teamId: id, channelId: id, type: "room" },
} satisfies WorkspaceInputs;

for (const [feature, schemas, examples] of [
  ["pages", pageInputSchemas, pages],
  ["rooms", roomInputSchemas, rooms],
  ["discussions", discussionInputSchemas, discussions],
  ["workspace", workspaceInputSchemas, workspace],
] as const) {
  test.each(Object.keys(schemas))(
    `${feature} %s accepts its DTO and rejects missing input`,
    (name) => {
      const schema = (
        schemas as Record<
          string,
          {
            parse(input: unknown): unknown;
            safeParse(input: unknown): { success: boolean };
          }
        >
      )[name]!;
      const example = (examples as Record<string, unknown>)[name];

      expect(schema.parse(example)).toEqual(example);
      expect(schema.safeParse(null).success).toBe(false);
    },
  );
}

test("nested workspace updates reject unknown actions, invalid roles, malformed folders and missing identifiers", () => {
  for (const teamUpdate of [
    { action: "unknown", update: {} },
    {
      action: "changeTeamMemberRole",
      update: { memberId: "member", role: "owner" },
    },
    { action: "addFolder", update: { folder: { id, name: "Folder" } } },
  ]) {
    expect(
      workspaceInputSchemas.updateTeam.safeParse({ teamId: id, teamUpdate })
        .success,
    ).toBe(false);
  }

  expect(
    workspaceInputSchemas.createTeam.safeParse({ id: "short", name: "Team" })
      .success,
  ).toBe(false);
});

test("shared user validation trims usernames and rejects malformed profiles", () => {
  expect(
    UpdateUserSchema.parse({
      username: "  user_name  ",
      displayName: "User",
      avatar: "",
    }).username,
  ).toBe("user_name");
  expect(
    UpdateUserSchema.safeParse({
      username: "!",
      displayName: "",
      avatar: "invalid",
    }).success,
  ).toBe(false);
});

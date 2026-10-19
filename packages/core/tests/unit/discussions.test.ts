import { describe, expect, test } from "vitest";
import { ThreadPostSchema } from "@wodge/domain/discussions/validation";
import { createCommentMutation } from "@wodge/core/discussions/mutations/create-comment";
import { editCommentMutation } from "@wodge/core/discussions/mutations/edit-comment";
import { deleteCommentMutation } from "@wodge/core/discussions/mutations/delete-comment";
import { createThreadMutation } from "@wodge/core/workspace/mutations/create-thread";
import { deleteThreadMutation } from "@wodge/core/workspace/mutations/delete-thread";
import {
  createTestStructure,
  createTestTeam,
  createTestThread,
  createThreadMessage,
} from "../fixtures/workspace";
import { UserId } from "../fixtures/users";

function createPost() {
  return ThreadPostSchema.parse({
    id: "post",
    content: "Question",
    type: "qa",
    author: UserId,
    createdAt: new Date().toISOString(),
  });
}

describe("discussion invariants", () => {
  test("thread creation and deletion preserve the owning team structure", () => {
    const thread = createTestThread();
    const team = createTestTeam();
    const structure = createTestStructure({ teams: [team] });
    const created = createThreadMutation({
      thread,
      teamId: team.id,
      curUserId: UserId,
      structure,
    });

    expect(created.teams[0]?.threads).toContainEqual(thread);
    expect(
      deleteThreadMutation({
        threadId: thread.id,
        teamId: team.id,
        structure: created,
      }).teams[0]?.threads,
    ).toEqual([]);
    expect(structure.teams[0]?.threads).toEqual([]);
  });

  test("an author can create, edit and delete a comment inside its post", () => {
    const post = createPost();
    const comment = createThreadMessage();
    const created = createCommentMutation({
      comment,
      postId: post.id,
      postsArray: [post],
      userId: UserId,
      isPrivileged: false,
    });

    expect(created[0]?.comments[0]).toMatchObject({
      id: comment.id,
      content: comment.content,
    });
    const edited = editCommentMutation({
      comment,
      postId: post.id,
      postsArray: created,
      userId: UserId,
      newContent: "Updated",
    });

    expect(edited[0]?.comments[0]).toMatchObject({
      content: "Updated",
      isEdited: true,
    });
    expect(
      deleteCommentMutation({
        comment,
        postId: post.id,
        postsArray: edited,
        userId: UserId,
        isPrivileged: false,
      })[0]?.comments,
    ).toEqual([]);
    expect(post.comments).toEqual([]);
  });

  test("another actor cannot impersonate, edit or delete the comment author", () => {
    const post = createPost();
    const comment = createThreadMessage();
    const postsArray = [{ ...post, comments: [comment] }];

    expect(() =>
      createCommentMutation({
        comment,
        postId: post.id,
        postsArray: [post],
        userId: "outsider",
        isPrivileged: false,
      }),
    ).toThrow("author error");
    expect(() =>
      editCommentMutation({
        comment,
        postId: post.id,
        postsArray,
        userId: "outsider",
        newContent: "Changed",
      }),
    ).toThrow("You are not allowed to edit this message");
    expect(() =>
      deleteCommentMutation({
        comment,
        postId: post.id,
        postsArray,
        userId: "outsider",
        isPrivileged: false,
      }),
    ).toThrow("You are not allowed to delete this message");
  });

  test("duplicate comments, missing posts and resolved discussions reject new messages", () => {
    const post = createPost();
    const comment = createThreadMessage();
    const args = {
      comment,
      postId: post.id,
      userId: UserId,
      isPrivileged: false,
    };

    expect(() =>
      createCommentMutation({
        ...args,
        postsArray: [{ ...post, comments: [comment] }],
      }),
    ).toThrow("message already exists");
    expect(() => createCommentMutation({ ...args, postsArray: [] })).toThrow(
      "post not found",
    );
    expect(() =>
      createCommentMutation({
        ...args,
        postsArray: [{ ...post, isResolved: true }],
      }),
    ).toThrow("post is resolved");
  });
});

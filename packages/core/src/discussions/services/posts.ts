import { DiscussionRepository } from "@wodge/core/discussions/repositories/posts";
import { discussionsError } from "@wodge/core/discussions/errors";
import {
  ThreadPostSchema,
  ThreadMessageSchema,
} from "@wodge/domain/discussions/validation";
import type { ResourceActor } from "@wodge/domain/channels/index";
import type { DiscussionInputs } from "@wodge/domain/discussions/dto";
import { inject, injectable } from "tsyringe";

const privileged = (actor: ResourceActor) =>
  actor.isAdmin || actor.isOwner || actor.isTeamModerator;
@injectable()
export class DiscussionService {
  constructor(
    @inject(DiscussionRepository) private readonly discussions: Pick<
      DiscussionRepository,
      keyof DiscussionRepository
    >,
  ) {}
  async createPost(
    input: DiscussionInputs["createPost"],
    actor: ResourceActor,
    revision?: number,
  ) {
    if (input.type === "post" && !privileged(actor)) return;
    const post = ThreadPostSchema.parse(input);
    if (post.author !== actor.userId)
      throw discussionsError("DISCUSSION_FORBIDDEN", "author error");
    return this.discussions.change(revision, () => {
      if (this.discussions.findPost(post.id))
        throw discussionsError("DISCUSSION_CONFLICT", "post already exists");
      this.discussions.insertPost({
        ...post,
        createdAt: new Date().toISOString(),
      });
    });
  }
  async editPost(
    input: DiscussionInputs["editPost"],
    actor: ResourceActor,
    revision?: number,
  ) {
    return this.discussions.change(revision, () => {
      const post = this.discussions.findPost(input.id);
      if ((post?.author ?? input.author) !== actor.userId)
        throw discussionsError(
          "DISCUSSION_FORBIDDEN",
          "You are not allowed to edit this message",
        );
      if (post)
        this.discussions.editPost(
          post.id,
          input.newContent,
          new Date().toISOString(),
        );
    });
  }
  async deletePost(
    input: DiscussionInputs["deletePost"],
    actor: ResourceActor,
    revision?: number,
  ) {
    return this.discussions.change(revision, () => {
      const post = this.discussions.findPost(input.id);
      if ((post?.author ?? input.author) !== actor.userId && !privileged(actor))
        throw discussionsError(
          "DISCUSSION_FORBIDDEN",
          "You are not allowed to delete this message",
        );
      this.discussions.deletePost(input.id);
    });
  }
  async togglePost(
    input: DiscussionInputs["togglePost"],
    actor: ResourceActor,
    revision?: number,
  ) {
    return this.discussions.change(revision, () => {
      const post = this.discussions.findPost(input);
      if (!post)
        throw discussionsError("DISCUSSION_NOT_FOUND", "post not found");
      if (post.author !== actor.userId && !privileged(actor))
        throw discussionsError(
          "DISCUSSION_FORBIDDEN",
          "You are not the creator of this thread",
        );
      this.discussions.resolvePost(post.id, !post.isResolved);
    });
  }
  async createComment(
    input: DiscussionInputs["createComment"],
    actor: ResourceActor,
    revision?: number,
  ) {
    const { postId, ...data } = input,
      comment = ThreadMessageSchema.parse(data);
    if (comment.author !== actor.userId)
      throw discussionsError("DISCUSSION_FORBIDDEN", "author error");
    return this.discussions.change(revision, () => {
      const post = this.discussions.findPost(postId);
      if (!post)
        throw discussionsError("DISCUSSION_NOT_FOUND", "post not found");
      if (
        comment.type !== "message" &&
        post.author !== actor.userId &&
        !privileged(actor)
      )
        throw discussionsError("DISCUSSION_FORBIDDEN", "not privileged");
      if (post.isResolved && comment.type === "message")
        throw discussionsError("DISCUSSION_CONFLICT", "post is resolved");
      if (this.discussions.findComment(postId, comment.id))
        throw discussionsError("DISCUSSION_CONFLICT", "message already exists");
      this.discussions.insertComment(postId, {
        ...comment,
        createdAt: new Date().toISOString(),
      });
    });
  }
  async editComment(
    input: DiscussionInputs["editComment"],
    actor: ResourceActor,
    revision?: number,
  ) {
    return this.discussions.change(revision, () => {
      const comment = this.discussions.findComment(
        input.postId,
        input.comment.id,
      );
      if ((comment?.author ?? input.comment.author) !== actor.userId)
        throw discussionsError(
          "DISCUSSION_FORBIDDEN",
          "You are not allowed to edit this message",
        );
      if (comment)
        this.discussions.editComment(
          input.postId,
          comment.id,
          input.newContent,
          new Date().toISOString(),
        );
    });
  }
  async deleteComment(
    input: DiscussionInputs["deleteComment"],
    actor: ResourceActor,
    revision?: number,
  ) {
    return this.discussions.change(revision, () => {
      const comment = this.discussions.findComment(input.postId, input.id);
      if (
        (comment?.author ?? input.author) !== actor.userId &&
        !privileged(actor)
      )
        throw discussionsError(
          "DISCUSSION_FORBIDDEN",
          "You are not allowed to delete this message",
        );
      this.discussions.deleteComment(input.postId, input.id);
    });
  }
  async vote(
    input: DiscussionInputs["vote"],
    actor: ResourceActor,
    revision?: number,
  ) {
    return this.discussions.change(revision, () => {
      const post = this.discussions.findPost(input.postId);
      if (!post)
        throw discussionsError("DISCUSSION_NOT_FOUND", "Messages not found");
      if (post.type !== "poll")
        throw discussionsError(
          "DISCUSSION_INVALID_INPUT",
          "Post is not a poll",
        );
      if (post.pollVoters.some((v) => v.voter === actor.userId))
        throw discussionsError("DISCUSSION_CONFLICT", "User already voted");
      if (input.option < 0 || input.option >= post.pollOptions.length)
        throw discussionsError("DISCUSSION_INVALID_INPUT", "Invalid option");
      this.discussions.castVote(post.id, actor.userId, input.option);
    });
  }
  async removeVote(
    input: DiscussionInputs["removeVote"],
    actor: ResourceActor,
    revision?: number,
  ) {
    return this.discussions.change(revision, () => {
      const post = this.discussions.findPost(input.postId);
      if (!post)
        throw discussionsError("DISCUSSION_NOT_FOUND", "Post not found");
      if (post.type !== "poll")
        throw discussionsError(
          "DISCUSSION_INVALID_INPUT",
          "Post is not a poll",
        );
      const vote = post.pollVoters.find((v) => v.voter === actor.userId);
      if (!vote) return;
      if (input.option < 0 || input.option >= post.pollOptions.length)
        throw discussionsError("DISCUSSION_INVALID_INPUT", "Invalid option");
      this.discussions.removeVote(post.id, actor.userId, vote.option);
    });
  }
}

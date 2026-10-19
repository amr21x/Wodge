import { createCommentMutation } from "@wodge/core/discussions/mutations/create-comment";
import { createPostMutation } from "@wodge/core/discussions/mutations/create-post";
import { deleteCommentMutation } from "@wodge/core/discussions/mutations/delete-comment";
import { deletePostMutation } from "@wodge/core/discussions/mutations/delete-post";
import { editCommentMutation } from "@wodge/core/discussions/mutations/edit-comment";
import { editPostMutation } from "@wodge/core/discussions/mutations/edit-post";
import { removePostVoteMutation } from "@wodge/core/discussions/mutations/remove-vote";
import { togglePostMutation } from "@wodge/core/discussions/mutations/toggle-post";
import { postVoteMutation } from "@wodge/core/discussions/mutations/vote";
import { DiscussionRepository } from "@wodge/core/discussions/repositories/posts";
import type { ResourceActor } from "@wodge/domain/channels/index";
import type { DiscussionInputs } from "@wodge/domain/discussions/dto";
import { inject, injectable } from "tsyringe";

@injectable()
export class DiscussionService {
  constructor(
    @inject(DiscussionRepository)
    private readonly discussions: Pick<DiscussionRepository, "get" | "save">,
  ) {}

  async deletePost(
    input: DiscussionInputs["deletePost"],
    actor: ResourceActor,
    revision?: number,
  ) {
    const data = this.discussions.get();
    const isPrivileged =
      actor.isAdmin || actor.isOwner || actor.isTeamModerator;
    const post = input;
    const d = deletePostMutation({
      isPrivileged,
      post: post,
      postsArray: data,
      userId: actor.userId,
    });

    await this.discussions.save(d, revision);
  }

  async editPost(
    input: DiscussionInputs["editPost"],
    actor: ResourceActor,
    revision?: number,
  ) {
    const data = this.discussions.get();
    const { newContent, ...post } = input;
    const d = editPostMutation({
      postsArray: data,
      newContent,
      userId: actor.userId,
      post,
    });

    await this.discussions.save(d, revision);
  }

  async togglePost(
    input: DiscussionInputs["togglePost"],
    actor: ResourceActor,
    revision?: number,
  ) {
    const data = this.discussions.get();
    const isPrivileged =
      actor.isAdmin || actor.isOwner || actor.isTeamModerator;
    const d = togglePostMutation({
      isPrivileged,
      postsArray: data,
      curUserId: actor.userId,
      postId: input,
    });

    await this.discussions.save(d, revision);
  }

  async createPost(
    input: DiscussionInputs["createPost"],
    actor: ResourceActor,
    revision?: number,
  ) {
    const data = this.discussions.get();
    const isPrivileged =
      actor.isAdmin || actor.isOwner || actor.isTeamModerator;
    const post = input;

    if (post.type === "post" && !isPrivileged) {
      return;
    }

    const d = createPostMutation({
      post: post,
      postsArray: data,
      userId: actor.userId,
    });

    await this.discussions.save(d, revision);
  }

  async removeVote(
    input: DiscussionInputs["removeVote"],
    actor: ResourceActor,
    revision?: number,
  ) {
    const data = this.discussions.get();
    const vote = input;

    await this.discussions.save(
      removePostVoteMutation({
        curUserId: actor.userId,
        postsArr: data,
        ...vote,
      }),
      revision,
    );
  }

  async vote(
    input: DiscussionInputs["vote"],
    actor: ResourceActor,
    revision?: number,
  ) {
    const data = this.discussions.get();
    const vote = input;

    await this.discussions.save(
      postVoteMutation({
        curUserId: actor.userId,
        postsArr: data,
        ...vote,
      }),
      revision,
    );
  }

  async deleteComment(
    input: DiscussionInputs["deleteComment"],
    actor: ResourceActor,
    revision?: number,
  ) {
    const data = this.discussions.get();
    const isPrivileged =
      actor.isAdmin || actor.isOwner || actor.isTeamModerator;
    const msg = input;
    const d = deleteCommentMutation({
      comment: msg,
      postId: msg.postId,
      postsArray: data,
      userId: actor.userId,
      isPrivileged: msg?.author === actor.userId || isPrivileged,
    });

    await this.discussions.save(d, revision);
  }

  async createComment(
    input: DiscussionInputs["createComment"],
    actor: ResourceActor,
    revision?: number,
  ) {
    const data = this.discussions.get();
    const isPrivileged =
      actor.isAdmin || actor.isOwner || actor.isTeamModerator;
    const { postId, ...comment } = input;
    const d = createCommentMutation({
      comment,
      postId,
      isPrivileged,
      postsArray: data,
      userId: actor.userId,
    });

    await this.discussions.save(d, revision);
  }

  async editComment(
    input: DiscussionInputs["editComment"],
    actor: ResourceActor,
    revision?: number,
  ) {
    const data = this.discussions.get();
    const { comment, postId, newContent } = input;
    const d = editCommentMutation({
      comment,
      postId,
      postsArray: data,
      newContent,
      userId: actor.userId,
    });

    await this.discussions.save(d, revision);
  }
}

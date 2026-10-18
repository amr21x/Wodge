import type {
  EditThreadMessageArg,
  PostVoteArgs,
} from "@wodge/domain/discussions/dto";
import { WriteTransaction } from "replicache";
import { PublicUserType } from "@wodge/domain/user/models";
import { queryClient } from "../../query";
import { ThreadMessage, ThreadPost } from "@wodge/domain/discussions/models";
import { deleteCommentMutation } from "@wodge/core/discussions/mutations/delete-comment";
import { editCommentMutation } from "@wodge/core/discussions/mutations/edit-comment";
import { createCommentMutation } from "@wodge/core/discussions/mutations/create-comment";
import { createPostMutation } from "@wodge/core/discussions/mutations/create-post";
import { deletePostMutation } from "@wodge/core/discussions/mutations/delete-post";
import { editPostMutation } from "@wodge/core/discussions/mutations/edit-post";
import { togglePostMutation } from "@wodge/core/discussions/mutations/toggle-post";
import { postVoteMutation } from "@wodge/core/discussions/mutations/vote";
import { removePostVoteMutation } from "@wodge/core/discussions/mutations/remove-vote";

export const threadMutators = {
  async createPost(tx: WriteTransaction, data: ThreadPost) {
    const posts = (await tx.get<ThreadPost[]>("posts")) || [];

    const user = queryClient.getQueryData<PublicUserType>(["user"]);

    if (!user) {
      throw new Error("User not found");
    }

    const newMsgs = createPostMutation({
      userId: user.id,
      post: data,
      postsArray: posts,
    });

    await tx.set("posts", newMsgs);
  },

  async deletePost(tx: WriteTransaction, post: ThreadPost) {
    const posts = (await tx.get<ThreadPost[]>("posts")) || [];

    const user = queryClient.getQueryData<PublicUserType>(["user"]);

    if (!user) {
      throw new Error("User not found");
    }

    const newPosts = deletePostMutation({
      isPrivileged: true,
      userId: user.id,
      post,
      postsArray: posts,
    });

    await tx.set("posts", newPosts);
  },
  async editPost(
    tx: WriteTransaction,
    post: ThreadPost & { newContent: string },
  ) {
    const posts = (await tx.get<ThreadPost[]>("posts")) || [];

    const user = queryClient.getQueryData<PublicUserType>(["user"]);

    if (!user) {
      throw new Error("User not found");
    }

    const { newContent, ...curPost } = post;
    const newPosts = editPostMutation({
      userId: user.id,
      post: curPost,
      postsArray: posts,
      newContent: newContent,
    });

    await tx.set("posts", newPosts);
  },

  async createComment(
    tx: WriteTransaction,
    data: ThreadMessage & { postId: string },
  ) {
    const posts = (await tx.get<ThreadPost[]>("posts")) || [];

    const user = queryClient.getQueryData<PublicUserType>(["user"]);

    const { postId, ...comment } = data;

    if (!user) {
      throw new Error("User not found");
    }

    const newPosts = createCommentMutation({
      postId,
      postsArray: posts,
      comment,
      isPrivileged: true,

      userId: user.id,
    });

    await tx.set("posts", newPosts);
  },

  async deleteComment(
    tx: WriteTransaction,
    args: ThreadMessage & { postId: string },
  ) {
    const posts = (await tx.get<ThreadPost[]>("posts")) || [];

    const user = queryClient.getQueryData<PublicUserType>(["user"]);

    if (!user) {
      throw new Error("User not found");
    }

    const { postId, ...comment } = args;
    const newPosts = deleteCommentMutation({
      isPrivileged: true,
      userId: user.id,
      comment,
      postId,
      postsArray: posts,
    });

    await tx.set("posts", newPosts);
  },

  async editComment(tx: WriteTransaction, args: EditThreadMessageArg) {
    const posts = (await tx.get<ThreadPost[]>("posts")) || [];

    const user = queryClient.getQueryData<PublicUserType>(["user"]);

    if (!user) {
      throw new Error("User not found");
    }

    const newPosts = editCommentMutation({
      userId: user.id,
      newContent: args.newContent,
      comment: args.comment,
      postId: args.postId,
      postsArray: posts,
    });

    await tx.set("posts", newPosts);
  },
  async togglePost(tx: WriteTransaction, postId: string) {
    const posts = (await tx.get<ThreadPost[]>("posts")) || [];

    const user = queryClient.getQueryData<PublicUserType>(["user"]);

    if (!user) {
      throw new Error("User not found");
    }

    const newPosts = togglePostMutation({
      postId,
      curUserId: user.id,
      isPrivileged: true,
      postsArray: posts,
    });

    await tx.set("posts", newPosts);
  },

  async vote(tx: WriteTransaction, data: PostVoteArgs) {
    const posts = await tx.get<ThreadPost[]>("posts");

    const user = queryClient.getQueryData<PublicUserType>(["user"]);

    if (!user) {
      throw new Error("User not found");
    }

    const newStructure = postVoteMutation({
      ...data,
      postsArr: posts as ThreadPost[],
      postId: data.postId,
      curUserId: user.id,
    });

    await tx.set("posts", newStructure);
  },
  async removeVote(tx: WriteTransaction, data: PostVoteArgs) {
    const posts = await tx.get<ThreadPost[]>("posts");

    const user = queryClient.getQueryData<PublicUserType>(["user"]);

    if (!user) {
      throw new Error("User not found");
    }

    const newStructure = removePostVoteMutation({
      ...data,
      postsArr: posts as ThreadPost[],
      postId: data.postId,
      curUserId: user.id,
    });

    await tx.set("posts", newStructure);
  },
};

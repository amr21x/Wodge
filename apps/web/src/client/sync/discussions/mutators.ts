import type {
  EditThreadMessageArg,
  PostVoteArgs,
} from "@wodge/domain/discussions/dto";
import { WriteTransaction } from "replicache";
import { ThreadMessage, ThreadPost } from "@wodge/domain/discussions/models";
import { deleteCommentMutation } from "./mutations/delete-comment";
import { editCommentMutation } from "./mutations/edit-comment";
import { createCommentMutation } from "./mutations/create-comment";
import { createPostMutation } from "./mutations/create-post";
import { deletePostMutation } from "./mutations/delete-post";
import { editPostMutation } from "./mutations/edit-post";
import { togglePostMutation } from "./mutations/toggle-post";
import { postVoteMutation } from "./mutations/vote";
import { removePostVoteMutation } from "./mutations/remove-vote";

export type ThreadMutators = ReturnType<typeof createThreadMutators>;

/** Keep optimistic identity tied to this replica, independent of profile cache timing. */
export function createThreadMutators(userId: string) {
  return {
    async createPost(tx: WriteTransaction, data: ThreadPost) {
      const posts = (await tx.get<ThreadPost[]>("posts")) || [];

      const newMsgs = createPostMutation({
        userId,
        post: data,
        postsArray: posts,
      });

      await tx.set("posts", newMsgs);
    },

    async deletePost(tx: WriteTransaction, post: ThreadPost) {
      const posts = (await tx.get<ThreadPost[]>("posts")) || [];

      const newPosts = deletePostMutation({
        isPrivileged: true,
        userId,
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

      const { newContent, ...curPost } = post;
      const newPosts = editPostMutation({
        userId,
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

      const { postId, ...comment } = data;

      const newPosts = createCommentMutation({
        postId,
        postsArray: posts,
        comment,
        isPrivileged: true,

        userId,
      });

      await tx.set("posts", newPosts);
    },

    async deleteComment(
      tx: WriteTransaction,
      args: ThreadMessage & { postId: string },
    ) {
      const posts = (await tx.get<ThreadPost[]>("posts")) || [];

      const { postId, ...comment } = args;
      const newPosts = deleteCommentMutation({
        isPrivileged: true,
        userId,
        comment,
        postId,
        postsArray: posts,
      });

      await tx.set("posts", newPosts);
    },

    async editComment(tx: WriteTransaction, args: EditThreadMessageArg) {
      const posts = (await tx.get<ThreadPost[]>("posts")) || [];

      const newPosts = editCommentMutation({
        userId,
        newContent: args.newContent,
        comment: args.comment,
        postId: args.postId,
        postsArray: posts,
      });

      await tx.set("posts", newPosts);
    },
    async togglePost(tx: WriteTransaction, postId: string) {
      const posts = (await tx.get<ThreadPost[]>("posts")) || [];

      const newPosts = togglePostMutation({
        postId,
        curUserId: userId,
        isPrivileged: true,
        postsArray: posts,
      });

      await tx.set("posts", newPosts);
    },

    async vote(tx: WriteTransaction, data: PostVoteArgs) {
      const posts = await tx.get<ThreadPost[]>("posts");

      const newStructure = postVoteMutation({
        ...data,
        postsArr: posts as ThreadPost[],
        postId: data.postId,
        curUserId: userId,
      });

      await tx.set("posts", newStructure);
    },
    async removeVote(tx: WriteTransaction, data: PostVoteArgs) {
      const posts = await tx.get<ThreadPost[]>("posts");

      const newStructure = removePostVoteMutation({
        ...data,
        postsArr: posts as ThreadPost[],
        postId: data.postId,
        curUserId: userId,
      });

      await tx.set("posts", newStructure);
    },
  };
}

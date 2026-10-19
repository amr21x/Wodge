import { discussionsError } from "@wodge/core/discussions/errors";
import { ThreadPost } from "@wodge/domain/discussions/models";
import { DrObj } from "@wodge/domain/types";
import { produce } from "immer";

interface ToggleThreadArgs {
  postId: string;
  postsArray: ThreadPost[] | DrObj<ThreadPost[]>;
  curUserId: string;
  isPrivileged: boolean;
}

export function togglePostMutation({
  isPrivileged,
  postId,
  postsArray,
  curUserId,
}: ToggleThreadArgs) {
  // Validate the data

  const newArr = produce(postsArray, (draft) => {
    const post = draft.find((p) => p.id === postId);
    // Check if team not found

    if (!post) {
      throw discussionsError("DISCUSSION_NOT_FOUND", "post not found");
    }

    if (!isPrivileged && curUserId !== post?.author) {
      throw discussionsError(
        "DISCUSSION_FORBIDDEN",
        "You are not the creator of this thread",
      );
    }

    post.isResolved = !post.isResolved;
  });

  return newArr as ThreadPost[];
}

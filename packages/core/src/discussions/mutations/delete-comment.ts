import { discussionsError } from "@wodge/core/discussions/errors";
import { ThreadMessage, ThreadPost } from "@wodge/domain/discussions/models";
import { DrObj } from "@wodge/domain/types";
import { produce } from "immer";

export function deleteCommentMutation({
  comment,
  postId,
  postsArray,
  userId,
  isPrivileged,
}: {
  postId: string;
  comment: ThreadMessage | DrObj<ThreadMessage>;
  postsArray: ThreadPost[] | DrObj<ThreadPost[]>;
  userId: string;
  isPrivileged: boolean;
}) {
  //check if the current userId is the author of the message or he has the role of owner or admin in the team
  if (comment.author !== userId && !isPrivileged) {
    throw discussionsError(
      "DISCUSSION_FORBIDDEN",
      "You are not allowed to delete this message",
    );
  }
  // delete the message using produce

  const newPostsArray = produce(postsArray, (draft) => {
    const postIdx = draft.findIndex((p) => p.id === postId);

    if (postIdx === -1) {
      return draft;
    }

    draft[postIdx]!.comments = draft[postIdx]!.comments.filter(
      (c) => c.id !== comment.id,
    );

    return draft;
  });

  return newPostsArray as ThreadPost[];
}

import { discussionsError } from "@wodge/core/discussions/errors";
import { ThreadPost } from "@wodge/domain/discussions/models";
import { DrObj } from "@wodge/domain/types";
import { produce } from "immer";

export function deletePostMutation({
  post,
  postsArray,
  userId,
  isPrivileged,
}: {
  post: ThreadPost | DrObj<ThreadPost>;
  postsArray: ThreadPost[] | DrObj<ThreadPost[]>;
  userId: string;
  isPrivileged: boolean;
}) {
  //check if the current userId is the author of the message or he has the role of owner or admin in the team
  if (post.author !== userId && !isPrivileged) {
    throw discussionsError(
      "DISCUSSION_FORBIDDEN",
      "You are not allowed to delete this message",
    );
  }
  // delete the message using produce

  const newPostsArray = produce(postsArray, (draft) => {
    return draft.filter((p) => p.id !== post.id);
  });

  return newPostsArray as ThreadPost[];
}

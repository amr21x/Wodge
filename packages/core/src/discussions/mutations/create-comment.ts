import { discussionsError } from "@wodge/core/discussions/errors";
import { ThreadMessage, ThreadPost } from "@wodge/domain/discussions/models";
import { ThreadMessageSchema } from "@wodge/domain/discussions/validation";
import { DrObj } from "@wodge/domain/types";
import { produce } from "immer";

export function createCommentMutation({
  comment,
  postId,
  postsArray,
  userId,
  isPrivileged,
}: {
  postId: string;
  comment: ThreadMessage;
  postsArray: ThreadPost[] | DrObj<ThreadPost[]>;
  userId: string;
  isPrivileged: boolean;
}) {
  const validateFields = ThreadMessageSchema.safeParse(comment);

  if (!validateFields.success) {
    throw discussionsError("DISCUSSION_INVALID_INPUT", "Invalid msg data");
  }

  //check the msg structure like the thread message structure if ok push the msg in the msgs array

  const { data: newComment } = validateFields;

  if (newComment.author !== userId) {
    throw discussionsError("DISCUSSION_FORBIDDEN", "author error");
  }

  const newPostsArray = produce(postsArray, (draft) => {
    const post = draft.find((p) => p.id === postId);

    if (!post) {
      throw discussionsError("DISCUSSION_NOT_FOUND", "post not found");
    }

    if (
      !isPrivileged &&
      post.author !== userId &&
      (comment.type === "open" || comment.type === "close")
    ) {
      throw discussionsError("DISCUSSION_FORBIDDEN", "not privileged");
    }

    if (post.isResolved && comment.type === "message") {
      throw discussionsError("DISCUSSION_CONFLICT", "post is resolved");
    }

    //check if the message is unique in the array

    if (post.comments.some((c) => c.id === newComment.id)) {
      throw discussionsError("DISCUSSION_CONFLICT", "message already exists");
    }

    post.comments.push({ ...newComment, createdAt: new Date().toISOString() });
  });

  return newPostsArray as ThreadPost[];
}

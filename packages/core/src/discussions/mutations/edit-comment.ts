import { discussionsError } from "@wodge/core/discussions/errors";
import { ThreadMessage, ThreadPost } from "@wodge/domain/discussions/models";
import { ThreadMessageSchema } from "@wodge/domain/discussions/validation";
import { DrObj } from "@wodge/domain/types";
import { produce } from "immer";

export function editCommentMutation({
  postId,
  comment,
  postsArray,
  newContent,
  userId,
}: {
  postId: string;
  comment: ThreadMessage;

  newContent: string;
  userId: string;
  postsArray: ThreadPost[] | DrObj<ThreadPost[]>;
}) {
  const validateFields = ThreadMessageSchema.pick({
    content: true,
  }).safeParse({ content: newContent });

  if (!validateFields.success) {
    console.log(validateFields.error.flatten());

    throw discussionsError("DISCUSSION_INVALID_INPUT", "Invalid msg data");
  }

  //check if you are allowed to edit the message

  if (userId !== comment.author) {
    throw discussionsError(
      "DISCUSSION_FORBIDDEN",
      "You are not allowed to edit this message",
    );
  }

  //replace the content of the message using produce

  const newPostsArray = produce(postsArray, (draft) => {
    const post = draft.find((p) => p.id === postId);

    if (!post) {
      return draft;
    }

    const com = post.comments.find((c) => c.id === comment.id);

    if (!com) {
      return draft;
    }

    com.content = newContent;
    com.isEdited = true;
    com.createdAt = new Date().toISOString();

    return draft;
  });

  return newPostsArray as ThreadPost[];
}

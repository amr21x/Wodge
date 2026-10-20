import { discussionsError } from "./errors";
import { ThreadPost } from "@wodge/domain/discussions/models";
import { ThreadPostSchema } from "@wodge/domain/discussions/validation";
import { DrObj } from "@wodge/domain/types";
import { produce } from "immer";

export function createPostMutation({
  post,
  postsArray,
  userId,
}: {
  post: ThreadPost;
  postsArray: ThreadPost[] | DrObj<ThreadPost[]>;
  userId: string;
}) {
  const validateFields = ThreadPostSchema.safeParse(post);

  if (!validateFields.success) {
    throw discussionsError("DISCUSSION_INVALID_INPUT", "Invalid msg data");
  }

  //check the msg structure like the thread message structure if ok push the msg in the msgs array

  const { data: newPost } = validateFields;

  if (post.author !== userId) {
    throw discussionsError("DISCUSSION_FORBIDDEN", "author error");
  }

  if (postsArray.some((p) => p.id === newPost.id)) {
    throw discussionsError("DISCUSSION_CONFLICT", "post already exists");
  }

  const newPostsArray = produce(postsArray, (draft) => {
    //check if the message is unique in the array
    draft.unshift({ ...newPost, createdAt: new Date().toISOString() });
  });

  return newPostsArray as ThreadPost[];
}

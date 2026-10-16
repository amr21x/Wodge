import { RunnerParams } from "../lib/replicache";
import { ThreadMessage } from "@wodge/data";
import { produce } from "immer";
import ThreadParty from "./thread-party";
import { createCommentMutation } from "@wodge/data/models/thread/mutators/create-comment";

export async function createComment(
  party: ThreadParty,
  params: RunnerParams,
  isPrivileged: boolean
) {
  const { postId, ...comment } = params.mutation.args as ThreadMessage & {
    postId: string;
  };
  const d = createCommentMutation({
    comment,
    postId,
    isPrivileged,
    postsArray: party.threadPosts.data,
    userId: params.userId,
  });

  party.threadPosts = produce(party.threadPosts, (draft) => {
    draft.data = d;
    draft.lastModifiedVersion = params.nextVersion;
  });

  await party.room.storage.put("posts", party.threadPosts);
}

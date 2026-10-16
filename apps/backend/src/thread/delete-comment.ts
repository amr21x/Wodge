import { RunnerParams } from "../lib/replicache";
import { ThreadMessage } from "@wodge/data";
import { produce } from "immer";
import ThreadParty from "./thread-party";
import { deleteCommentMutation } from "@wodge/data/models/thread/mutators/delete-comment";

export async function deleteComment(
  party: ThreadParty,
  params: RunnerParams,
  isPrivileged: boolean
) {
  const msg = params.mutation.args as ThreadMessage;

  const d = deleteCommentMutation({
    comment: msg,
    postId: params.mutation.args.postId,
    postsArray: party.threadPosts.data,
    userId: params.userId,
    isPrivileged: msg?.author === params.userId || isPrivileged,
  });

  party.threadPosts = produce(party.threadPosts, (draft) => {
    draft.data = d;
    draft.lastModifiedVersion = params.nextVersion;
  });

  await party.room.storage.put("posts", party.threadPosts);
}

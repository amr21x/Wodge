import { RunnerParams } from "../lib/replicache";
import { EditThreadMessageArg, ThreadMessage } from "@wodge/data";
import { produce } from "immer";
import ThreadParty from "./thread-party";
import { editCommentMutation } from "@wodge/data/models/thread/mutators/edit-comment";

export async function editComment(party: ThreadParty, params: RunnerParams) {
  const { comment, postId, newContent } = params.mutation
    .args as EditThreadMessageArg;

  const d = editCommentMutation({
    comment,
    postId,
    postsArray: party.threadPosts.data,
    newContent,
    userId: params.userId,
  });

  party.threadPosts = produce(party.threadPosts, (draft) => {
    draft.data = d;
    draft.lastModifiedVersion = params.nextVersion;
  });

  await party.room.storage.put("posts", party.threadPosts);
}

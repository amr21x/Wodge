import { RunnerParams } from "../lib/replicache";
import { EditThreadMessageArg, ThreadMessage, ThreadPost } from "@wodge/data";
import { produce } from "immer";
import ThreadParty from "./thread-party";
import { editCommentMutation } from "@wodge/data/models/thread/mutators/edit-comment";
import { editPostMutation } from "@wodge/data/models/thread/mutators/edit-post";

export async function editPost(party: ThreadParty, params: RunnerParams) {
  const { newContent, ...post } = params.mutation.args as ThreadPost & {
    newContent: string;
  };

  const d = editPostMutation({
    postsArray: party.threadPosts.data,
    newContent,
    userId: params.userId,
    post,
  });

  party.threadPosts = produce(party.threadPosts, (draft) => {
    draft.data = d;
    draft.lastModifiedVersion = params.nextVersion;
  });

  await party.room.storage.put("posts", party.threadPosts);
}

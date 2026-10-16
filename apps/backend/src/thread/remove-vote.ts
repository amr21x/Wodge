import { RunnerParams } from "@/lib/replicache";
import { removePostVoteMutation } from "@wodge/data/models/thread/mutators/remove-vote";
import ThreadParty from "./thread-party";
import { PostVoteArgs } from "@wodge/data";
import { produce } from "immer";

export async function removeVote(party: ThreadParty, params: RunnerParams) {
  const vote = params.mutation.args as PostVoteArgs;

  party.threadPosts = produce(party.threadPosts, (draft) => {
    draft.data = removePostVoteMutation({
      curUserId: params.userId,
      postsArr: draft.data,
      ...vote,
    });
    draft.lastModifiedVersion = params.nextVersion;
  });

  await party.room.storage.put("posts", party.threadPosts);
}

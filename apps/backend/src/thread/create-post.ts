import { RunnerParams } from "../lib/replicache";
import { ThreadPost } from "@wodge/data";
import { produce } from "immer";
import ThreadParty from "./thread-party";
import { createPostMutation } from "@wodge/data/models/thread/mutators/create-post";

export async function createPost(
  party: ThreadParty,
  params: RunnerParams,
  isPrivileged: boolean
) {
  const post = params.mutation.args as ThreadPost;
  if (post.type === "post" && !isPrivileged) return;

  const d = createPostMutation({
    post: post,
    postsArray: party.threadPosts.data,
    userId: params.userId,
  });

  party.threadPosts = produce(party.threadPosts, (draft) => {
    draft.data = d;
    draft.lastModifiedVersion = params.nextVersion;
  });

  await party.room.storage.put("posts", party.threadPosts);
}

import { discussionsError } from "./errors";
import { ThreadPost } from "@wodge/domain/discussions/models";
import { DrObj } from "@wodge/domain/types";
import { produce } from "immer";

interface VoteArgs {
  postId: string;
  option: number;
  postsArr: ThreadPost[] | DrObj<ThreadPost[]>;
  curUserId: string;
}

export function postVoteMutation({
  option,
  curUserId,
  postId,
  postsArr,
}: VoteArgs) {
  const newArr = produce(postsArr, (draft) => {
    const post = draft.find((m) => m.id === postId);
    // Check if team not found

    if (!post) {
      throw discussionsError("DISCUSSION_NOT_FOUND", "Messages not found");
    }

    if (post.type !== "poll") {
      throw discussionsError("DISCUSSION_INVALID_INPUT", "Post is not a poll");
    }

    const curVote = post.pollVoters?.find((v) => v.voter === curUserId);

    if (curVote) {
      throw discussionsError("DISCUSSION_CONFLICT", "User already voted");
    }

    if (post.pollOptions && option >= post.pollOptions?.length) {
      throw discussionsError("DISCUSSION_INVALID_INPUT", "Invalid option");
    }

    post.pollVoters?.push({ voter: curUserId, option });
    if (post.votes![option]) {
      post.votes![option]!++;
    } else {
      post.votes![option] = 1;
    }
  });

  return newArr as ThreadPost[];
}

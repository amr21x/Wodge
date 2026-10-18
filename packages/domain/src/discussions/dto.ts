import type { z } from "zod";
import type { discussionInputSchemas } from "./validation";

export type DiscussionInputs = {
  [Operation in keyof typeof discussionInputSchemas]: z.output<
    (typeof discussionInputSchemas)[Operation]
  >;
};

export type EditThreadMessageArg = DiscussionInputs["editComment"];

export type PostVoteArgs = DiscussionInputs["vote"];

import { z } from "zod";

import { ChannelSchema } from "@wodge/domain/channels/index";

export const ThreadSchema = z.object(ChannelSchema.shape);

export const ThreadMessageSchema = z.object({
  id: z.string(),
  author: z.string(),
  content: z.string().min(1).max(4096),
  createdAt: z.string().datetime(),
  isEdited: z.boolean().default(false).optional(),
  type: z.enum(["message", "open", "close"]),
});

export const ThreadPostSchema = z.object({
  id: z.string(),
  content: z.string().min(1),
  type: z.enum(["post", "qa", "poll"]),
  author: z.string(),
  isResolved: z.boolean().default(false).optional(),
  isEdited: z.boolean().default(false).optional(),
  createdAt: z.string().datetime(),
  pollOptions: z.array(z.string()).optional().default([]),
  votes: z.array(z.number()).optional().default([]),
  pollVoters: z
    .array(
      z.object({
        voter: z.string(),
        option: z.number(),
      }),
    )
    .optional()
    .default([]),
  isVoteOpen: z.boolean().default(true).optional(),
  comments: z.array(ThreadMessageSchema).optional().default([]),
});

export const MIN_OPTIONS = 2;

export const MAX_OPTIONS = 10;

const comment = ThreadMessageSchema.extend({ postId: z.string() });

const vote = z.object({ postId: z.string(), option: z.number().int() });

export const discussionInputSchemas = {
  createPost: ThreadPostSchema,
  editPost: ThreadPostSchema.extend({ newContent: z.string().min(1) }),
  deletePost: ThreadPostSchema,
  togglePost: z.string(),
  createComment: comment,
  editComment: z.object({
    comment: ThreadMessageSchema,
    newContent: z.string().min(1).max(4096),
    postId: z.string(),
  }),
  deleteComment: comment,
  vote,
  removeVote: vote,
};

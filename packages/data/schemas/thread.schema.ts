import { z } from "zod";

import { ChannelSchema } from "@wodge/domain/channels";
import { WORKSPACE_GROUP_ID_LENGTH } from "@wodge/domain/constants";

export const ThreadSchema = ChannelSchema.extend({
  viewGroups: z
    .array(
      z.string().length(WORKSPACE_GROUP_ID_LENGTH).or(z.literal("team-members"))
    )
    .optional()
    .default(["team-members"]),
  editGroups: z
    .array(
      z.string().length(WORKSPACE_GROUP_ID_LENGTH).or(z.literal("team-members"))
    )
    .optional()
    .default(["team-members"]),
});

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
      })
    )
    .optional()
    .default([]),
  isVoteOpen: z.boolean().default(true).optional(),
  comments: z.array(ThreadMessageSchema).optional().default([]),
});

export type ThreadMessage = z.infer<typeof ThreadMessageSchema>;
export type ThreadPost = z.infer<typeof ThreadPostSchema>;
export type Thread = z.infer<typeof ThreadSchema>;
export const MIN_OPTIONS = 2;
export const MAX_OPTIONS = 10;

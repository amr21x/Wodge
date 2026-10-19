import { z } from "zod";
import { ChannelSchema } from "@wodge/domain/channels/index";

export const MessageSchema = z.object({
  id: z.string(),
  sender: z.string(),
  content: z.string().min(1).max(1024),
  date: z.string().datetime(),
  type: z
    .enum(["text", "mention", "image", "audio", "video", "file", "poll"])
    .default("text"),
  isEdited: z.boolean().default(false).optional(),

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
});

export const RoomSchema = ChannelSchema.extend({});

const vote = z.object({ msgId: z.string(), option: z.number().int() });

export const roomInputSchemas = {
  sendMessage: MessageSchema,
  editMessage: z.object({
    message: MessageSchema,
    newContent: z.string().min(1).max(1024),
  }),
  deleteMessage: MessageSchema,
  vote,
  removeVote: vote,
};

import { z } from "zod";
import {
  BRAND_COLOR,
  WORKSPACE_GROUP_ID_LENGTH,
  WORKSPACE_TEAM_ID_LENGTH,
} from "@wodge/domain/constants";
import { ThreadSchema } from "./thread.schema";
import { RoomSchema } from "./room.schema";
import { PageSchema } from "@wodge/domain/pages";

// export const TagSchema = z.object({
//   name: z.string().max(70),
//   color: z.string().default(BRAND_COLOR).optional(),
// });

export const FolderSchema = z.object({
  id: z.string().length(WORKSPACE_GROUP_ID_LENGTH),
  name: z.string().max(70).min(1),
  channels: z.array(PageSchema),

  parentFolder: z.string().optional(),
});

export const TeamSchema = z.object({
  id: z.string().length(WORKSPACE_TEAM_ID_LENGTH),
  name: z.string().max(70).min(1),
  avatar: z.optional(z.string()),
  members: z.array(z.string()),
  moderators: z.array(z.string()),
  createdBy: z.string(),

  folders: z.array(FolderSchema),
  rooms: z.array(RoomSchema),
  threads: z.array(ThreadSchema),
  // tags: z.array(TagSchema),
  default: z.boolean().default(false),
});

export type Team = z.infer<typeof TeamSchema>;
// export type Tag = z.infer<typeof TagSchema>;
export type Folder = z.infer<typeof FolderSchema>;

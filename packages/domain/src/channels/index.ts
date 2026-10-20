import type { Permissions } from "../authorization/permissions";
import { entityIdSchema } from "@wodge/domain/identifiers";
import { z } from "zod";
import { LEGACY_ENTITY_ID_LENGTH } from "../constants";

export const ChannelTypeSchema = z.enum([
  "page",
  "room",
  "thread",
  "resources",
]);
export type ChannelsTypes = z.output<typeof ChannelTypeSchema>;

export const ChannelSchema = z.object({
  id: entityIdSchema(LEGACY_ENTITY_ID_LENGTH),
  name: z.string().max(70).min(1),
  avatar: z.string().optional(),
});

export type Channel = z.infer<typeof ChannelSchema>;

export const AuthChannelResponseSchema = z.object({
  success: z.boolean(),
  isMember: z.boolean().optional(),
  isOwner: z.boolean().optional(),
  isAdmin: z.boolean().optional(),
  canEdit: z.boolean().optional(),
  canView: z.boolean().optional(),
  isTeamModerator: z.boolean().optional(),
});
export type AuthChannelResponse = z.output<typeof AuthChannelResponseSchema>;

/** Verified identity and the existing resource-specific write capabilities. */
export interface ResourceActor {
  permissions?: Permissions;
  userId: string;
  isAdmin: boolean;
  isOwner: boolean;
  isTeamModerator: boolean;
  canEdit: boolean;
}

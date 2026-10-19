import { ChannelTypeSchema } from "@wodge/domain/channels/index";
import { WorkspaceSchema } from "@wodge/domain/workspace/validation";
import { z } from "zod";

export const UpdateWorkspaceBody = WorkspaceSchema.pick({
  name: true,
  slug: true,
}).strict();

export const ChannelAccessHeaders = z.object({
  userId: z.string().min(1),
  teamId: z.string().optional(),
  folderId: z.string().optional(),
  channelId: z.string().min(1),
  channelType: ChannelTypeSchema,
});

export const WorkspaceParams = z.object({
  workspaceId: z.string().min(1).max(256),
});
export const MemberParams = WorkspaceParams.extend({
  memberId: z.string().min(1).max(256),
});
export const JoinParams = WorkspaceParams.extend({
  token: z.string().min(1).max(256),
});
export const PreviewParams = z.object({
  slug: z.string().min(1).max(256),
  token: z.string().min(1).max(256),
});

export const MemberRoleBody = z
  .object({ role: z.enum(["owner", "admin", "member"]) })
  .strict();

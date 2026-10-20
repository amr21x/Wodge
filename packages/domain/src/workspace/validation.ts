import { entityIdSchema } from "@wodge/domain/identifiers";
import { z } from "zod";
import { LEGACY_FOLDER_ID_LENGTH, LEGACY_TEAM_ID_LENGTH } from "../constants";
import { ThreadSchema } from "../discussions/validation";
import { PageSchema } from "../pages/validation";
import { RoomSchema } from "../rooms/validation";

export const FolderSchema = z.object({
  id: entityIdSchema(LEGACY_FOLDER_ID_LENGTH).or(
    z
      .string()
      .refine(
        (value) =>
          value.startsWith("root-") &&
          entityIdSchema(LEGACY_TEAM_ID_LENGTH).safeParse(value.slice(5))
            .success,
      ),
  ),
  name: z.string().max(70).min(1),
  channels: z.array(PageSchema),

  parentFolder: z.string().optional(),
});

export const TeamSchema = z.object({
  id: entityIdSchema(LEGACY_TEAM_ID_LENGTH),
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

export const WorkspaceSchema = z.object({
  id: z.string().optional(),
  owner: z.string(),
  name: z.string().min(1).max(70),
  slug: z
    .string({ required_error: "Slug is required" })
    .trim()
    .max(24, "Slug must be between 3 and 24 characters.")
    .min(3, "Slug must be between 3 and 24 characters.")
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      "Only letters, numbers, dashes, and underscores.",
    ),
  avatar: z.string().nullable().optional(),
  createdAt: z.date().optional(),
  isInviteLinkEnabled: z.boolean().nullable().optional(),
  isPremium: z.boolean().nullable().optional(),
  customerId: z.string().nullable().optional(),
});

export const MemberSchema = z.object({
  id: z.string(),
  role: z.enum(["owner", "admin", "member"]),
  joinInfo: z.object({
    token: z.string(),
    createdBy: z.string(),
    joinedAt: z.string().datetime(),
  }),
});

export const WorkspaceStructureSchema = z.object({
  teams: z.array(TeamSchema),
});

export const WorkspaceMembersSchema = z.object({
  createdBy: z.string(),
  members: z.array(MemberSchema),
});

export const NewWorkspaceSchema = WorkspaceSchema.pick({
  name: true,
  slug: true,
});

export const JoinWorkspaceSchema = z.object({
  url: z
    .string({
      required_error: "Invite link is required",
    })
    .url({
      message: "Invalid URL",
    }),
});

const members = z.object({ members: z.array(z.string()) });

const teamUpdate = z.union([
  z.object({
    action: z.literal("updateInfo"),
    update: z.object({ name: z.string(), avatar: z.string().optional() }),
  }),
  z.object({
    action: z.enum(["addMembers", "removeMembers"]),
    update: members,
  }),
  z.object({
    action: z.literal("addFolder"),
    update: z.object({ folder: FolderSchema }),
  }),
  z.object({
    action: z.literal("removeFolders"),
    update: z.object({ folders: z.array(z.string()) }),
  }),
  z.object({
    action: z.literal("changeTeamMemberRole"),
    update: z.object({
      memberId: z.string(),
      role: z.enum(["teamMember", "moderator"]),
    }),
  }),
]);

const page = PageSchema.extend({ teamId: z.string(), folderId: z.string() });

const room = RoomSchema.extend({ teamId: z.string() });

const thread = ThreadSchema.extend({ teamId: z.string() });

export const workspaceInputSchemas = {
  createTeam: TeamSchema.pick({ id: true, name: true, avatar: true }),
  updateTeam: z.object({ teamId: z.string(), teamUpdate }),
  deleteTeam: z.string(),
  createPage: page,
  updatePage: page,
  createRoom: room,
  updateRoom: room,
  createThread: thread,
  updateThread: thread,
  updateFolder: FolderSchema.extend({ teamId: z.string() }),
  deleteFolder: z.object({ teamId: z.string(), folderId: z.string() }),
  deleteChannel: z.object({
    channelId: z.string(),
    folderId: z.string().optional(),
    teamId: z.string(),
    type: z.enum(["page", "room", "thread", "resources"]),
  }),
};

export const PresenceInputSchema = z.object({
  userId: z.string(),
  connect: z.boolean(),
});

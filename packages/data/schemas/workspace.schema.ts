import {
  BRAND_COLOR,
  ID_LENGTH,
  WORKSPACE_GROUP_ID_LENGTH,
} from "@wodge/domain/constants";
import { TeamSchema } from "./team.schema";
import {
  integer,
  primaryKey,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";
import { users } from "./auth.schema";
import { z } from "zod";
import { createInsertSchema } from "drizzle-zod";
import { nanoid } from "nanoid";
import { relations } from "drizzle-orm";

export const workspaces = sqliteTable("workspaces", {
  id: text("id")
    .notNull()
    .primaryKey()
    .$defaultFn(() => nanoid(ID_LENGTH)),
  owner: text("owner")
    .notNull()
    .references(() => users.id),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  avatar: text("avatar"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
  isInviteLinkEnabled: integer("is_invite_link_enabled", {
    mode: "boolean",
  }).default(true),
  isPremium: integer("is_premium", { mode: "boolean" }).default(false),
  customerId: text("customer_id"),
});

export const memberships = sqliteTable(
  "memberships",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
  },
  (table) => ({
    pk: primaryKey({
      columns: [table.userId, table.workspaceId],
    }),
  })
);

export const workspaceMemberships = relations(workspaces, ({ many }) => ({
  memberships: many(memberships),
}));

export const userMemberships = relations(users, ({ many }) => ({
  memberships: many(memberships),
}));

export const userToWorkspaces = relations(memberships, ({ one }) => ({
  user: one(users, {
    fields: [memberships.userId],
    references: [users.id],
  }),
  workspace: one(workspaces, {
    fields: [memberships.workspaceId],
    references: [workspaces.id],
  }),
}));

export const invites = sqliteTable(
  "invites",
  {
    token: text("token").unique().notNull(),
    createdBy: text("created_by").references(() => users.id),
    emails: text("emails"),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
  },
  (table) => ({
    primaryKey: primaryKey({
      columns: [table.token, table.workspaceId],
    }),
  })
);

export const WorkspaceSchema = createInsertSchema(workspaces, {
  name: z.string().min(1).max(70),
  slug: z
    .string({
      required_error: "Slug is required",
    })
    .trim()
    .max(24, "Slug must be between 3 and 24 characters.")
    .min(3, "Slug must be between 3 and 24 characters.")
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      "Only letters, numbers, dashes, and underscores."
    ),
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

export const GroupSchema = z.object({
  id: z.string().length(WORKSPACE_GROUP_ID_LENGTH),
  name: z.string().max(70).min(1),
  members: z.array(z.string()),
  color: z.string().default(BRAND_COLOR),
  createdBy: z.string(),
});

export const WorkspaceStructureSchema = z.object({
  teams: z.array(TeamSchema),
  groups: z.array(GroupSchema),
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

export const PresenceRequestSchema = z.object({
  userId: z.string(),
  connect: z.boolean(),
});

export type Workspace = z.infer<typeof WorkspaceSchema> & {
  id: string;
};
export type Member = z.infer<typeof MemberSchema>;
export type Group = z.infer<typeof GroupSchema>;

export type WorkspaceStructure = z.infer<typeof WorkspaceStructureSchema>;
export type WorkspaceMembers = z.infer<typeof WorkspaceMembersSchema>;

export type NewWorkspace = z.infer<typeof NewWorkspaceSchema>;

export type Invite = typeof invites.$inferSelect;
export type Invites = Map<string, Invite>;

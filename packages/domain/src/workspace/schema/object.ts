import { sql } from "drizzle-orm";
import {
  sqliteTable,
  text,
  integer,
  primaryKey,
  index,
  check,
} from "drizzle-orm/sqlite-core";

export const workspace_membership = sqliteTable(
  "workspace_membership",
  {
    id: integer("id").primaryKey(),
    created_by: text("created_by").notNull(),
  },
  (t) => [check("workspace_membership_singleton", sql`${t.id} = 1`)],
);

export const workspace_members = sqliteTable("workspace_members", {
  id: text("id").primaryKey(),
  position: integer("position").notNull(),
  role: text("role").notNull(),
  token: text("token").notNull(),
  created_by: text("created_by").notNull(),
  joined_at: text("joined_at").notNull(),
});

export const workspace_teams = sqliteTable("workspace_teams", {
  id: text("id").primaryKey(),
  position: integer("position").notNull(),
  name: text("name").notNull(),
  avatar: text("avatar"),
  created_by: text("created_by").notNull(),
  is_default: integer("is_default").notNull(),
});

export const workspace_team_members = sqliteTable(
  "workspace_team_members",
  {
    team_id: text("team_id")
      .notNull()
      .references(() => workspace_teams.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    position: integer("position").notNull(),
    user_id: text("user_id").notNull(),
  },
  (t) => [primaryKey({ columns: [t.team_id, t.kind, t.position] })],
);

export const workspace_folders = sqliteTable(
  "workspace_folders",
  {
    team_id: text("team_id")
      .notNull()
      .references(() => workspace_teams.id, { onDelete: "cascade" }),
    id: text("id").notNull(),
    position: integer("position").notNull(),
    name: text("name").notNull(),
    parent_folder: text("parent_folder"),
  },
  (t) => [primaryKey({ columns: [t.team_id, t.id] })],
);

export const workspace_channels = sqliteTable(
  "workspace_channels",
  {
    team_id: text("team_id")
      .notNull()
      .references(() => workspace_teams.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    id: text("id").notNull(),
    folder_id: text("folder_id"),
    position: integer("position").notNull(),
    name: text("name").notNull(),
    avatar: text("avatar"),
  },
  (t) => [
    primaryKey({ columns: [t.team_id, t.kind, t.id] }),
    index("workspace_channel_placement").on(
      t.team_id,
      t.kind,
      t.folder_id,
      t.position,
    ),
  ],
);

// Temporary access projections consumed once by authorization bootstrap after upgrading old data.
export const workspace_permission_imports = sqliteTable(
  "workspace_permission_imports",
  {
    scope_type: text("scope_type", {
      enum: ["room", "page", "thread"],
    }).notNull(),
    scope_id: text("scope_id").notNull(),
    subject_type: text("subject_type", { enum: ["user", "team"] }).notNull(),
    subject_id: text("subject_id").notNull(),
    access: text("access", { enum: ["read", "update"] }).notNull(),
  },
  (t) => [
    primaryKey({
      columns: [
        t.scope_type,
        t.scope_id,
        t.subject_type,
        t.subject_id,
        t.access,
      ],
    }),
  ],
);
export const workspace_permission_import_state = sqliteTable(
  "workspace_permission_import_state",
  {
    id: integer("id").primaryKey(),
    complete: integer("complete").notNull(),
  },
  (t) => [check("workspace_permission_import_singleton", sql`${t.id} = 1`)],
);

export const workspace_presence = sqliteTable("workspace_presence", {
  user_id: text("user_id").primaryKey(),
  online: integer("online").notNull(),
});
export const workspace_presence_import = sqliteTable(
  "workspace_presence_import",
  { id: integer("id").primaryKey() },
);

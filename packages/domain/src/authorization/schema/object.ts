import {
  sqliteTable,
  text,
  integer,
  primaryKey,
} from "drizzle-orm/sqlite-core";
export const authorization_policy = sqliteTable("authorization_policy", {
  id: integer("id").primaryKey(),
  workspace_id: text("workspace_id"),
  revision: integer("revision").notNull(),
  schema_version: integer("schema_version").notNull(),
  resources_migrated: integer("resources_migrated"),
});
export const authorization_roles = sqliteTable("authorization_roles", {
  id: text("id").primaryKey(),
  position: integer("position").notNull(),
  name: text("name").notNull(),
  system: text("system", {
    enum: ["owner", "administrator", "reader", "editor", "moderator"],
  }),
});
export const authorization_permissions = sqliteTable(
  "authorization_permissions",
  {
    role_id: text("role_id")
      .notNull()
      .references(() => authorization_roles.id, { onDelete: "cascade" }),
    resource: text("resource").notNull(),
    action: text("action").notNull(),
    position: integer("position").notNull(),
  },
  (t) => [primaryKey({ columns: [t.role_id, t.resource, t.action] })],
);
export const authorization_assignments = sqliteTable(
  "authorization_assignments",
  {
    id: text("id").primaryKey(),
    position: integer("position").notNull(),
    role_id: text("role_id")
      .notNull()
      .references(() => authorization_roles.id, { onDelete: "cascade" }),
    subject_type: text("subject_type", { enum: ["user", "team"] }).notNull(),
    subject_id: text("subject_id").notNull(),
    scope_type: text("scope_type", {
      enum: ["workspace", "team", "room", "page", "thread"],
    }).notNull(),
    scope_id: text("scope_id").notNull(),
  },
);
export const authorization_outbox = sqliteTable("authorization_outbox", {
  id: text("id").primaryKey(),
  workspace_id: text("workspace_id").notNull(),
  revision: integer("revision").notNull(),
  created_at: integer("created_at").notNull(),
});

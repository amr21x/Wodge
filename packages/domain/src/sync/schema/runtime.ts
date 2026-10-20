import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
export const sync_import = sqliteTable("sync_import", {
  id: integer("id").primaryKey(),
  legacy_versions: integer("legacy_versions").notNull().default(0),
});
export const sync_versions = sqliteTable("sync_versions", {
  name: text("name").primaryKey(),
  revision: integer("revision").notNull(),
});
export const sync_client_groups = sqliteTable("sync_client_groups", {
  key: text("key").primaryKey(),
  id: text("id").notNull(),
  user_id: text("user_id").notNull(),
  client_version: integer("client_version"),
});
export const sync_clients = sqliteTable("sync_clients", {
  key: text("key").primaryKey(),
  id: text("id").notNull(),
  group_id: text("group_id").notNull(),
  last_mutation_id: integer("last_mutation_id").notNull(),
  last_modified_version: integer("last_modified_version").notNull(),
});

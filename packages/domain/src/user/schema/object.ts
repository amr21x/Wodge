import { sql } from "drizzle-orm";
import {
  sqliteTable,
  text,
  integer,
  primaryKey,
  check,
} from "drizzle-orm/sqlite-core";

export const user_workspaces = sqliteTable("user_workspaces", {
  workspace_id: text("workspace_id").primaryKey(),
  position: integer("position").notNull(),
});

export const user_structure_import = sqliteTable(
  "user_structure_import",
  {
    id: integer("id").primaryKey(),
  },
  (t) => [check("user_structure_import_singleton", sql`${t.id} = 1`)],
);

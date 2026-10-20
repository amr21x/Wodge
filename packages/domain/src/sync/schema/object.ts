import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const record_metadata = sqliteTable("record_metadata", {
  name: text("name").primaryKey(),
  revision: integer("revision").notNull(),
  deleted: integer("deleted").notNull(),
});

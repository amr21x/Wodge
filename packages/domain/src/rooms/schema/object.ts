import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

export const room_messages = sqliteTable(
  "room_messages",
  {
    id: text("id").primaryKey(),
    position: integer("position").notNull(),
    sender: text("sender").notNull(),
    content: text("content").notNull(),
    date: text("date").notNull(),
    type: text("type").notNull(),
    is_edited: integer("is_edited"),
    is_vote_open: integer("is_vote_open"),
  },
  (t) => [index("room_messages_order").on(t.position)],
);

export const room_scope = sqliteTable("room_scope", {
  id: integer("id").primaryKey(),
  legacy_records: integer("legacy_records").notNull().default(0),
  workspace_id: text("workspace_id"),
  team_id: text("team_id"),
  room_id: text("room_id"),
});

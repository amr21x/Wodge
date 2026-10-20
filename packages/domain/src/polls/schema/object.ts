import {
  sqliteTable,
  text,
  integer,
  primaryKey,
} from "drizzle-orm/sqlite-core";

export const poll_options = sqliteTable(
  "poll_options",
  {
    parent_id: text("parent_id").notNull(),
    position: integer("position").notNull(),
    label: text("label").notNull(),
  },
  (t) => [primaryKey({ columns: [t.parent_id, t.position] })],
);

export const poll_counts = sqliteTable(
  "poll_counts",
  {
    parent_id: text("parent_id").notNull(),
    position: integer("position").notNull(),
    votes: integer("votes").notNull(),
  },
  (t) => [primaryKey({ columns: [t.parent_id, t.position] })],
);

export const poll_voters = sqliteTable(
  "poll_voters",
  {
    parent_id: text("parent_id").notNull(),
    position: integer("position").notNull(),
    voter: text("voter").notNull(),
    option: integer("option").notNull(),
  },
  (t) => [primaryKey({ columns: [t.parent_id, t.position] })],
);

import {
  sqliteTable,
  text,
  integer,
  primaryKey,
  index,
} from "drizzle-orm/sqlite-core";

export const thread_posts = sqliteTable(
  "thread_posts",
  {
    id: text("id").primaryKey(),
    position: integer("position").notNull(),
    author: text("author").notNull(),
    content: text("content").notNull(),
    created_at: text("created_at").notNull(),
    type: text("type").notNull(),
    is_resolved: integer("is_resolved"),
    is_edited: integer("is_edited"),
    is_vote_open: integer("is_vote_open"),
  },
  (t) => [index("thread_posts_order").on(t.position)],
);

export const thread_comments = sqliteTable(
  "thread_comments",
  {
    post_id: text("post_id")
      .notNull()
      .references(() => thread_posts.id, { onDelete: "cascade" }),
    id: text("id").notNull(),
    position: integer("position").notNull(),
    author: text("author").notNull(),
    content: text("content").notNull(),
    created_at: text("created_at").notNull(),
    type: text("type").notNull(),
    is_edited: integer("is_edited"),
  },
  (t) => [
    primaryKey({ columns: [t.post_id, t.id] }),
    index("thread_comments_order").on(t.post_id, t.position),
  ],
);

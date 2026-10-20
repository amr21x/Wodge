import { sql } from "drizzle-orm";
import {
  sqliteTable,
  customType,
  text,
  integer,
  primaryKey,
  index,
  check,
} from "drizzle-orm/sqlite-core";

export const page_columns = sqliteTable("page_columns", {
  id: text("id").primaryKey(),
  position: integer("position").notNull(),
  title: text("title"),
});

export const page_tasks = sqliteTable(
  "page_tasks",
  {
    id: text("id").primaryKey(),
    column_id: text("column_id").notNull(),
    position: integer("position").notNull(),
    overview: text("overview"),
    title: text("title"),
    due_from: text("due_from"),
    due_to: text("due_to"),
    has_due: integer("has_due").notNull(),
    has_assignees: integer("has_assignees").notNull(),
    priority: text("priority"),
    include_time: integer("include_time").notNull(),
  },
  (t) => [index("page_tasks_column_order").on(t.column_id, t.position)],
);

export const page_task_assignees = sqliteTable(
  "page_task_assignees",
  {
    task_id: text("task_id")
      .notNull()
      .references(() => page_tasks.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    user_id: text("user_id").notNull(),
  },
  (t) => [primaryKey({ columns: [t.task_id, t.position] })],
);

// Yjs keeps its binary CRDT representation; SQL stores bytes without converting it to JSON.
const documentBytes = customType<{ data: Uint8Array; driverData: ArrayBuffer }>(
  {
    dataType: () => "blob",
    toDriver: (value) => new Uint8Array(value).buffer,
    fromDriver: (value) => new Uint8Array(value),
  },
);

export const page_document = sqliteTable(
  "page_document",
  {
    id: integer("id").primaryKey(),
    sequence: integer("sequence").notNull(),
    snapshot_sequence: integer("snapshot_sequence").notNull(),
    snapshot: documentBytes("snapshot"),
  },
  (t) => [check("page_document_singleton", sql`${t.id} = 1`)],
);

export const page_document_updates = sqliteTable("page_document_updates", {
  sequence: integer("sequence").primaryKey(),
  update: documentBytes("update").notNull(),
});

import { and, eq, getTableColumns } from "drizzle-orm";
import type { SQLiteTable } from "drizzle-orm/sqlite-core";
import type { ObjectDatabase } from "./object-database";

/** Diff table entities so unchanged rows are not rewritten. Keys come from the owning schema. */
export function reconcileRows<T extends SQLiteTable>(
  db: ObjectDatabase,
  table: T,
  keys: readonly (keyof T["$inferSelect"] & string)[],
  rows: readonly T["$inferSelect"][],
) {
  const columns = getTableColumns(table);
  const keyOf = (row: T["$inferSelect"]) =>
    JSON.stringify(keys.map((key) => row[key]));
  const existing = new Map(
    db
      .select()
      .from(table)
      .all()
      .map((row) => [keyOf(row), row]),
  );
  const seen = new Set<string>();
  for (const row of rows) {
    const key = keyOf(row);
    if (seen.has(key)) throw new Error("Duplicate entity row key");
    seen.add(key);
    const before = existing.get(key);
    if (
      !before ||
      Object.keys(columns).some((column) => before[column] !== row[column])
    ) {
      db.insert(table)
        .values(row)
        .onConflictDoUpdate({
          target: keys.map((key) => columns[key]!),
          set: row,
        })
        .run();
    }
    existing.delete(key);
  }
  for (const row of existing.values()) {
    db.delete(table)
      .where(and(...keys.map((key) => eq(columns[key]!, row[key]))))
      .run();
  }
}

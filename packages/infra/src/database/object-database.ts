import {
  drizzle,
  type DrizzleSqliteDODatabase,
} from "drizzle-orm/durable-sqlite";

/** A private DO SQLite connection, never the shared D1 database handle. */
export type ObjectDatabase = DrizzleSqliteDODatabase;

export function createObjectDatabase(
  storage: DurableObjectStorage,
): ObjectDatabase {
  return drizzle(storage);
}

import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/durable-sqlite/migrator";
import type { ObjectDatabase } from "./object-database";
import user from "../../database/objects/user/bundle.json";
import workspace from "../../database/objects/workspace/bundle.json";
import room from "../../database/objects/room/bundle.json";
import thread from "../../database/objects/thread/bundle.json";
import page from "../../database/objects/page/bundle.json";

const migrations = { user, workspace, room, thread, page };
const initialized = new WeakMap<ObjectDatabase, Promise<void>>();

/** The official DO migrator runs once per activation, using a migration stream separate from D1. */
export function prepareObjectDatabase(
  db: ObjectDatabase,
  kind: keyof typeof migrations,
): Promise<void> {
  const existing = initialized.get(db);
  if (existing) return existing;
  const ready = (async () => {
    const bundle = migrations[kind];
    // Retain the previous implementation's forward-version guard during table adoption.
    if (
      db.get(
        sql`SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'object_schema_migrations'`,
      )
    ) {
      const legacy = db.get<{ version: number }>(
        sql`SELECT MAX(version) AS version FROM object_schema_migrations WHERE scope = ${kind}`,
      );
      if (legacy && legacy.version > 1)
        throw new Error(`Unsupported ${kind} object schema version`);
    }
    if (
      db.get(
        sql`SELECT name FROM sqlite_master WHERE type = 'table' AND name = '__drizzle_migrations'`,
      )
    ) {
      const current = db.get<{ created_at: number }>(
        sql`SELECT created_at FROM __drizzle_migrations ORDER BY created_at DESC LIMIT 1`,
      );
      const latest = bundle.journal.entries.at(-1)?.when ?? 0;
      if (current && current.created_at > latest)
        throw new Error(`Unsupported ${kind} object schema version`);
    }
    await migrate(db, bundle);
  })();
  initialized.set(db, ready);
  void ready.catch(() => initialized.delete(db));
  return ready;
}

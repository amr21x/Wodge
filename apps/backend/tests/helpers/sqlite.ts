import { createRequire } from "node:module";
import { vi } from "vitest";

// Node's SQLite exercises real constraints/queries; the production Worker is also tested in Miniflare.
const { DatabaseSync } = createRequire(import.meta.url)("node:sqlite") as {
  DatabaseSync: new (path: string) => {
    exec(sql: string): void;
    prepare(sql: string): {
      all(
        ...values: (SqlStorageValue | Uint8Array)[]
      ): Record<string, SqlStorageValue>[];
    };
  };
};

export function attachSql<T extends object>(
  storage: T,
): T & Pick<DurableObjectStorage, "sql" | "transactionSync" | "list"> {
  if ("sql" in storage)
    return storage as T &
      Pick<DurableObjectStorage, "sql" | "transactionSync" | "list">;
  const database = new DatabaseSync(":memory:");
  database.exec("PRAGMA foreign_keys = ON");
  let transaction = 0;
  const sql = {
    exec: vi.fn((query: string, ...values: SqlStorageValue[]) => {
      const rows = database
        .prepare(query)
        .all(
          ...values.map((value) =>
            value instanceof ArrayBuffer ? new Uint8Array(value) : value,
          ),
        );
      const iterator = rows[Symbol.iterator]();
      return {
        next: () => iterator.next(),
        toArray: () => rows,
        one: () => {
          if (rows.length !== 1) throw new Error("Expected one SQL row");
          return rows[0];
        },
        *raw() {
          for (const row of rows) yield Object.values(row);
        },
        [Symbol.iterator]: () => rows[Symbol.iterator](),
      };
    }),
  } as unknown as SqlStorage;
  return Object.assign(storage, {
    list:
      "list" in storage
        ? (storage.list as DurableObjectStorage["list"])
        : async () => new Map(),
    sql,
    transactionSync<T>(run: () => T): T {
      const savepoint = `test_${++transaction}`;
      database.exec(`SAVEPOINT ${savepoint}`);
      try {
        const result = run();
        database.exec(`RELEASE ${savepoint}`);
        return result;
      } catch (error) {
        database.exec(`ROLLBACK TO ${savepoint}`);
        database.exec(`RELEASE ${savepoint}`);
        throw error;
      }
    },
  });
}

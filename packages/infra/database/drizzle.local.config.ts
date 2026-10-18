import { defineConfig } from "drizzle-kit";
import { readdirSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const directory = resolve(
  "../../apps/backend/.wrangler/state/v3/d1/miniflare-D1DatabaseObject",
);

const databases = existsSync(directory)
  ? readdirSync(directory).filter((name) => name.endsWith(".sqlite"))
  : [];

const database =
  process.env.WODGE_LOCAL_DATABASE ??
  (databases.length === 1 ? resolve(directory, databases[0]!) : undefined);

if (!database) {
  throw new Error(
    "Set WODGE_LOCAL_DATABASE to the local backend D1 SQLite file",
  );
}

export default defineConfig({
  schema: [
    "../domain/src/auth/schema/d1.ts",
    "../domain/src/workspace/schema/d1.ts",
    "../domain/src/billing/schema/d1.ts",
  ],
  out: "../domain/migrations",
  dialect: "sqlite",
  dbCredentials: { url: database },
});

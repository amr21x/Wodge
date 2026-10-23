import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: [
    "../domain/src/sync/schema/runtime.ts",
    "../domain/src/pages/schema/object.ts",
    "../domain/src/sync/schema/object.ts",
  ],
  out: "database/objects/page",
  dialect: "sqlite",
});

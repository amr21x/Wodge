import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: [
    "../domain/src/authorization/schema/object.ts",
    "../domain/src/sync/schema/runtime.ts",
    "../domain/src/workspace/schema/object.ts",
    "../domain/src/sync/schema/object.ts",
  ],
  out: "database/objects/workspace",
  dialect: "sqlite",
});

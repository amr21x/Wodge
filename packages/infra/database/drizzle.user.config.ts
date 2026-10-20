import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: [
    "../domain/src/sync/schema/runtime.ts",
    "../domain/src/user/schema/object.ts",
  ],
  out: "database/objects/user",
  dialect: "sqlite",
});

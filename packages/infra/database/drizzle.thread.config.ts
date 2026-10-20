import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: [
    "../domain/src/sync/schema/runtime.ts",
    "../domain/src/discussions/schema/object.ts",
    "../domain/src/sync/schema/object.ts",
    "../domain/src/polls/schema/object.ts",
  ],
  out: "database/objects/thread",
  dialect: "sqlite",
});

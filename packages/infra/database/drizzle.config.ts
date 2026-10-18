import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: [
    "../domain/src/auth/schema/d1.ts",
    "../domain/src/workspace/schema/d1.ts",
    "../domain/src/billing/schema/d1.ts",
  ],
  out: "../domain/migrations",
  dialect: "sqlite",
});

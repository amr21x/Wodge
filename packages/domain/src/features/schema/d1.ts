import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

// Keep the raw integer so malformed values cannot be coerced by a boolean mapper.
export const featureFlags = sqliteTable("feature_flags", {
  key: text("key").primaryKey(),
  enabled: integer("enabled").notNull(),
});

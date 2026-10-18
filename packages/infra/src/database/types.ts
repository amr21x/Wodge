import type * as schema from "@wodge/domain/auth/schema/d1";
import type { DrizzleD1Database } from "drizzle-orm/d1";

/** The configured database handle injected into feature queries. */
export type Database = DrizzleD1Database<typeof schema>;

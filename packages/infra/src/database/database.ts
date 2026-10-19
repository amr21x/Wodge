import * as authSchema from "@wodge/domain/auth/schema/d1";
import type { ServerEnvironment } from "@wodge/env/server";
import type { Database } from "@wodge/infra/database/types";
import { drizzle } from "drizzle-orm/d1";

const schema = authSchema;

export function createDatabase(environment: ServerEnvironment): Database {
  return drizzle(environment.DB, { schema });
}

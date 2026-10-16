import type { D1Database } from "@cloudflare/workers-types";
import { createDataServer } from "@wodge/data/server";

export interface DataBindings {
  DB: D1Database;
}

// Persistence boundary only. HTTP, sync and MCP callers retain authorization.
export function createBackendData(env: DataBindings) {
  return createDataServer(env.DB);
}

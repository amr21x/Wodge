import type { ApiType } from "backend/api";
import { hc } from "hono/client";

/** Same-origin Worker API; the backend contributes declarations only. */
export const api = hc<ApiType>("/", {
  init: { credentials: "include" },
});

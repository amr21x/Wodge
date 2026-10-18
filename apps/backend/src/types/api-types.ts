import type { Hono } from "hono";
import type { ExtractSchema } from "hono/types";
import type { BackendApplication } from "../application";

// Only the public HTTP schema crosses this boundary, never Worker bindings or DI.
export type ApiType = Hono<{}, ExtractSchema<BackendApplication["router"]>>;

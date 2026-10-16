/**
 * Client modules
 */

import type { DeepReadonlyObject } from "replicache";

/**
 * End of client modules
 */

/**
 * Shared schemas
 */

export * from "./schemas/auth.schema";
export * from "./schemas/user.schema";
export * from "./schemas/workspace.schema";
export * from "./schemas/team.schema";
export * from "./schemas/thread.schema";
export * from "./schemas/room.schema";

/**
 * End of shared schemas
 */

/**
 * Keys
 */

export * from "./lib/keys";

/**
 * End of keys
 */

/**
 * RBAC
 */

export * from "./lib/rbac";

/**
 * End of RBAC
 */

/**
 * Utils
 */

export * from "./lib/utils";

export type DrObj<T> = DeepReadonlyObject<T>;

/**
 * Mutators
 */

export * from "./models/workspace/workspace-shared-model";
export type * from "./models/room/room-mutators";
export type * from "./models/thread/thread-mutators";

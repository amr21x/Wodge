import { backendApplication } from "./di/runtime";
import type { WorkerEnvironment } from "./types/worker-environment";

// Wrangler discovers Durable Object classes through these entry-point exports.
export { default as UserServer } from "./servers/user";
export { default as WorkspaceServer } from "./servers/workspace";
export { default as RoomServer } from "./servers/room";
export { default as ThreadServer } from "./servers/thread";
export { default as PageServer } from "./servers/page";

export default {
  fetch(
    request: Request,
    environment: WorkerEnvironment,
    context?: ExecutionContext,
  ) {
    return backendApplication(environment).router.fetch(
      request,
      environment,
      context,
    );
  },
};

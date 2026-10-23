import type { DependencyContainer } from "tsyringe";
import { createRuntimeContainer } from "../../src/container";
import { WorkspaceNotifications } from "../../src/gateways/workspace-notifications";
import { ThreadSync } from "../../src/lib/sync/discussions";
import { PageSync } from "../../src/lib/sync/pages";
import { RoomSync } from "../../src/lib/sync/rooms";
import { WorkspaceSync } from "../../src/lib/sync/workspace";
import { DiscussionRoutes } from "../../src/routes/discussions";
import { PageRoutes } from "../../src/routes/pages";
import { RoomRoutes } from "../../src/routes/rooms";
import { UserRoutes } from "../../src/routes/user";
import { WorkspaceRoutes } from "../../src/routes/workspace";
import type { WorkerEnvironment } from "../../src/types/worker-environment";
import { createTestEnvironment } from "./environment";

export interface TestRouteResources {
  container: DependencyContainer;
  sync?: any;
  workspaceId?: string;
  notify?: (...args: any[]) => unknown;
}

/** Exercise the production router constructors using fixture-owned dependencies. */
function fixtureRouter(
  kind: "room" | "page" | "thread" | "workspace" | "user",
) {
  const routeClasses = {
    room: RoomRoutes,
    page: PageRoutes,
    thread: DiscussionRoutes,
    workspace: WorkspaceRoutes,
    user: UserRoutes,
  };
  const syncClasses = {
    room: RoomSync,
    page: PageSync,
    thread: ThreadSync,
    workspace: WorkspaceSync,
  };
  return {
    request(input: string, init?: RequestInit, resources?: TestRouteResources) {
      const environment = createTestEnvironment() as WorkerEnvironment;
      const container =
        resources?.container ?? createRuntimeContainer(environment);
      if (!container.isRegistered("objectKind"))
        container.registerInstance("objectKind", kind);
      if (!container.isRegistered("objectId"))
        container.registerInstance("objectId", resources?.workspaceId ?? "one");
      if (!container.isRegistered(kind))
        container.registerInstance(kind, {
          name: "one",
          env: environment,
          ctx: { storage: resources?.sync?.storage ?? {} },
          versions:
            resources?.sync?.versions ?? new Map([["globalVersion", 0]]),
          poke: resources?.notify ?? (() => {}),
          workspacesStore: new Set(),
          workspaceMembers: { data: { createdBy: "owner", members: [] } },
          workspaceStructure: { data: { teams: [] } },
        });
      if (!container.isRegistered("storage"))
        container.registerInstance("storage", resources?.sync?.storage ?? {});
      if (resources?.sync && kind !== "user")
        container.registerInstance(syncClasses[kind], resources.sync);
      if (resources?.notify)
        container.registerInstance(WorkspaceNotifications, {
          notify: async (...args: any[]) => {
            await resources.notify!(...args);
          },
        } as never);
      return container
        .resolve(routeClasses[kind])
        .router.request(input, init, environment);
    },
  };
}
export const roomsRoutes = fixtureRouter("room");
export const pagesRoutes = fixtureRouter("page");
export const discussionsRoutes = fixtureRouter("thread");
export const workspaceRoutes = fixtureRouter("workspace");
export const userRoutes = fixtureRouter("user");

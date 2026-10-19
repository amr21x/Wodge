import { validateServerEnvironment } from "@wodge/env/server";
import { createRuntimeContainer } from "../container";
import { BackendApplication } from "../application";
import type { WorkerEnvironment } from "../types/worker-environment";
import { WorkspaceGateway } from "../gateways/workspace";
import { WorkspaceHandlers } from "../handlers/workspace/handlers";
import { AuthorizationInvalidations } from "../lib/authorization/invalidation";
import { RoomRecordRepository } from "@wodge/core/rooms/repositories/records";
import { RoomRoutes } from "../routes/rooms";
import type RoomServer from "../servers/room";
import { DiscussionRecordRepository } from "@wodge/core/discussions/repositories/records";
import { DiscussionRoutes } from "../routes/discussions";
import type ThreadServer from "../servers/thread";
import { UserRecordRepository } from "@wodge/core/user/repositories/records";
import { UserRoutes } from "../routes/user";
import type UserServer from "../servers/user";
import { WorkspaceRecordRepository } from "@wodge/core/workspace/repositories/records";
import { WorkspaceRoutes } from "../routes/workspace";
import type WorkspaceServer from "../servers/workspace";
import { PageRecordRepository } from "@wodge/core/pages/repositories/records";
import { PageRoutes } from "../routes/pages";
import type PageServer from "../servers/page";

// Environment identity prevents reusing dependencies after bindings/secrets change.
const applications = new WeakMap<WorkerEnvironment, BackendApplication>();

export function backendApplication(
  environment: WorkerEnvironment,
): BackendApplication {
  let application = applications.get(environment);
  if (!application) {
    validateServerEnvironment(environment);
    application =
      createRuntimeContainer(environment).resolve(BackendApplication);
    applications.set(environment, application);
  }
  return application;
}

// This is the Cloudflare construction boundary. Container access stays here;
// servers receive ready instances and never resolve dependencies per callback.
/** Initialize once during RoomServer.onStart, before requests can run. */
export async function initializeRoom(object: RoomServer) {
  const container = createRuntimeContainer(object.env, {
    type: "room",
    instance: object,
  });
  const records = container.resolve(RoomRecordRepository);
  // Restore persisted state before exposing services that read the live object state.
  const restored = await records.loadRoom();
  object.messages = restored.messages;
  object.versions = restored.versions;
  const routes = container.resolve(RoomRoutes);
  return routes;
}

/** Initialize once during ThreadServer.onStart, before requests can run. */
export async function initializeThread(object: ThreadServer) {
  const container = createRuntimeContainer(object.env, {
    type: "thread",
    instance: object,
  });
  const records = container.resolve(DiscussionRecordRepository);
  // Restore persisted state before exposing services that read the live object state.
  const restored = await records.loadThread();
  object.threadPosts = restored.threadPosts;
  object.versions = restored.versions;
  const routes = container.resolve(DiscussionRoutes);
  return routes;
}

/** Initialize once during UserServer.onStart, before requests can run. */
export async function initializeUser(object: UserServer) {
  const container = createRuntimeContainer(object.env, {
    type: "user",
    instance: object,
  });
  const records = container.resolve(UserRecordRepository);
  // Restore persisted state before exposing services that read the live object state.
  const restored = await records.loadUser();
  object.workspacesStore = restored.workspacesStore;
  object.versions = restored.versions;
  const routes = container.resolve(UserRoutes);
  return { routes, workspaceGateway: container.resolve(WorkspaceGateway) };
}

/** Initialize once during WorkspaceServer.onStart, before requests can run. */
export async function initializeWorkspace(object: WorkspaceServer) {
  const container = createRuntimeContainer(object.env, {
    type: "workspace",
    instance: object,
  });
  const records = container.resolve(WorkspaceRecordRepository);
  // Restore persisted state before exposing services that read the live object state.
  const restored = await records.loadWorkspace();
  object.workspaceMembers = restored.workspaceMembers;
  object.workspaceStructure = restored.workspaceStructure;
  object.versions = restored.versions;
  object.presenceMap = restored.presenceMap;
  const routes = container.resolve(WorkspaceRoutes);
  const invalidations = container.resolve(AuthorizationInvalidations);
  await container.resolve(WorkspaceHandlers).bindRooms();
  await invalidations.flush();
  return { routes, invalidations };
}

/** Initialize once during PageServer.onStart, before requests can run. */
export async function initializePage(object: PageServer) {
  const container = createRuntimeContainer(object.env, {
    type: "page",
    instance: object,
  });
  const records = container.resolve(PageRecordRepository);
  // Restore persisted state before exposing services that read the live object state.
  const restored = await records.loadPage();
  object.state = restored.state;
  object.versions = restored.versions;
  const routes = container.resolve(PageRoutes);
  return { routes, records };
}

import { ResourceGrantCache } from "@wodge/auth/authorization/grants";
import { createRuntimeContainer } from "../../src/container";
import { WorkspaceNotifications } from "../../src/gateways/workspace-notifications";
import { ThreadSync } from "../../src/lib/sync/discussions";
import { PageSync } from "../../src/lib/sync/pages";
import { RoomSync } from "../../src/lib/sync/rooms";
import { WorkspaceSync } from "../../src/lib/sync/workspace";
import type PageServer from "../../src/servers/page";
import type RoomServer from "../../src/servers/room";
import type ThreadServer from "../../src/servers/thread";
import type WorkspaceServer from "../../src/servers/workspace";

export function pageBindings(party: PageServer) {
  const scope = createRuntimeContainer(party.env, {
    type: "page",
    instance: party,
  });
  return {
    container: scope,
    sync: scope.resolve(PageSync),
    dispose: () => scope.dispose(),
  };
}
export function roomBindings(party: RoomServer) {
  const scope = createRuntimeContainer(party.env, {
    type: "room",
    instance: party,
  });
  const authorization = (
    party as unknown as { authorization?: ResourceGrantCache }
  ).authorization;
  if (authorization) {
    scope.registerInstance(ResourceGrantCache, authorization);
  }
  return {
    container: scope,
    sync: scope.resolve(RoomSync),
    dispose: () => scope.dispose(),
  };
}
export function threadBindings(party: ThreadServer) {
  const scope = createRuntimeContainer(party.env, {
    type: "thread",
    instance: party,
  });
  return {
    container: scope,
    sync: scope.resolve(ThreadSync),
    dispose: () => scope.dispose(),
  };
}
export function workspaceBindings(party: WorkspaceServer) {
  const scope = createRuntimeContainer(party.env, {
    type: "workspace",
    instance: party,
  });
  return {
    container: scope,
    workspaceId: party.name,
    notify: scope.resolve(WorkspaceNotifications).notify,
    sync: scope.resolve(WorkspaceSync),
    dispose: () => scope.dispose(),
  };
}

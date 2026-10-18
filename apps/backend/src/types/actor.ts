import type { ResourceActor } from "@wodge/domain/channels/index";

export type RequestActor = ResourceActor & {
  canView: boolean;
  workspaceId?: string;
};

export type ActorVariables = { actor: RequestActor };

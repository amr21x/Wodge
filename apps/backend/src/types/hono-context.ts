import type { UserType } from "@wodge/domain/user/models";
import type { ActorVariables } from "./actor";
import type { WorkerEnvironment } from "./worker-environment";

export type ApiContext = {
  Bindings: WorkerEnvironment;
  Variables: { user: UserType; sessionId: string };
};
export type UserContext = {
  Bindings: WorkerEnvironment;
  Variables: ActorVariables;
};
export type WorkspaceContext = {
  Bindings: WorkerEnvironment;
  Variables: ActorVariables;
};
export type RoomContext = {
  Bindings: WorkerEnvironment;
  Variables: ActorVariables;
};
export type ThreadContext = {
  Bindings: WorkerEnvironment;
  Variables: ActorVariables;
};
export type PageContext = {
  Bindings: WorkerEnvironment;
  Variables: ActorVariables;
};

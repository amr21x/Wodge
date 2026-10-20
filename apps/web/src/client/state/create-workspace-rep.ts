import { Replicache } from "replicache";

import { replicacheWrapper } from "@/client/sync/transport";
import {
  createWorkspaceMutators,
  type WorkspaceMutators,
} from "@/client/sync/workspace/mutators";

export function createWorkspaceRep(userId: string, workspaceId: string) {
  return new Replicache<WorkspaceMutators>({
    name: `${userId}-${workspaceId}`,
    mutators: createWorkspaceMutators(userId),
    pullInterval: null,
    pushURL: undefined,
    pullURL: undefined,
    puller: replicacheWrapper("pull", "workspace", workspaceId),
    pusher: replicacheWrapper("push", "workspace", workspaceId),
  });
}

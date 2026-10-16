import {
  PullRequest,
  PullerResult,
  PushRequest,
  PusherResult,
  Replicache,
} from "replicache";

import { env } from "@wodge/env";
import { replicacheWrapper } from "@wodge/data/browser";
import { workspaceMutators } from "@wodge/data/models/workspace/workspace-mutators";

export function createWorkspaceRep(userId: string, workspaceId: string) {
  return new Replicache<typeof workspaceMutators>({
    name: `${userId}-${workspaceId}`,
    licenseKey: env.NEXT_PUBLIC_REPLICACHE_KEY,
    mutators: workspaceMutators,
    pullInterval: null,
    pushURL: undefined,
    pullURL: undefined,
    puller: replicacheWrapper<PullRequest, PullerResult>(
      "pull",
      "workspace",
      workspaceId,
    ),
    pusher: replicacheWrapper<PushRequest, PusherResult>(
      "push",
      "workspace",
      workspaceId,
    ),
  });
}

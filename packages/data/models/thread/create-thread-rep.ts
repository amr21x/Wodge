import {
  PullerResult,
  PullRequest,
  PusherResult,
  PushRequest,
  Replicache,
} from "replicache";
import { env } from "@wodge/env/client";
import { replicacheWrapper } from "../../lib/browser-utils";
import { threadMutators } from "./thread-mutators";

export function createThreadRep({
  channelId,
  userId,
  workspaceId,
  teamId,
}: {
  userId: string;
  workspaceId: string;
  channelId: string;
  teamId: string;
}) {
  return new Replicache<typeof threadMutators>({
    name: `${userId}-${channelId}`,
    licenseKey: env.NEXT_PUBLIC_REPLICACHE_KEY,
    mutators: threadMutators,
    pullInterval: null,
    pushURL: undefined,
    pullURL: undefined,
    puller: replicacheWrapper<PullRequest, PullerResult>(
      "pull",
      "thread",
      channelId,
      {
        "x-workspace-id": workspaceId,
        "x-team-id": teamId,
      },
    ),
    pusher: replicacheWrapper<PushRequest, PusherResult>(
      "push",
      "thread",
      channelId,
      {
        "x-workspace-id": workspaceId,
        "x-team-id": teamId,
      },
    ),
  });
}

import {
  PullerResult,
  PullRequest,
  PusherResult,
  PushRequest,
  Replicache,
} from "replicache";
import { env } from "@wodge/env/client";
import { replicacheWrapper } from "@wodge/data/browser";
import { pageMutators } from "./mutators";

export function createPageRep({
  channelId,
  userId,
  workspaceId,
  teamId,
  folderId,
}: {
  userId: string;
  workspaceId: string;
  channelId: string;
  teamId: string;
  folderId: string;
}) {
  return new Replicache<typeof pageMutators>({
    name: `${userId}-${channelId}`,
    licenseKey: env.NEXT_PUBLIC_REPLICACHE_KEY,
    mutators: pageMutators,
    pullInterval: null,
    pushURL: undefined,
    pullURL: undefined,
    puller: replicacheWrapper<PullRequest, PullerResult>(
      "pull",
      "page",
      channelId,
      {
        "x-workspace-id": workspaceId,
        "x-team-id": teamId,
        "x-folder-id": folderId,
      },
    ),
    pusher: replicacheWrapper<PushRequest, PusherResult>(
      "push",
      "page",
      channelId,
      {
        "x-workspace-id": workspaceId,
        "x-team-id": teamId,
        "x-folder-id": folderId,
      },
    ),
  });
}

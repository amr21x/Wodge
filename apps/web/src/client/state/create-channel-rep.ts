import {
  MutatorDefs,
  PullRequest,
  PullerResult,
  PushRequest,
  PusherResult,
  Replicache,
} from "replicache";

import { env } from "@wodge/env/client";
import { ChannelsTypes } from "@wodge/domain/channels/index";
import { replicacheWrapper } from "@/client/sync/transport";

export interface CreateChannelArgs {
  userId: string;
  workspaceId: string;
  channelId: string;
  teamId: string;
  folderId?: string;
  channelType: ChannelsTypes;
}

export function createChannelRep<T extends MutatorDefs>({
  channelId,
  userId,
  workspaceId,
  teamId,
  folderId,
  channelType,
  mutators,
}: CreateChannelArgs & { mutators: T }) {
  return new Replicache<T>({
    name: `${userId}-${channelId}`,
    licenseKey: env.NEXT_PUBLIC_REPLICACHE_KEY,
    mutators,
    pullInterval: null,
    pushURL: undefined,
    pullURL: undefined,
    puller: replicacheWrapper<PullRequest, PullerResult>(
      "pull",
      channelType,
      channelId,
      {
        "x-workspace-id": workspaceId,
        "x-team-id": teamId,
        ...(folderId && { "x-folder-id": folderId }),
      },
    ),
    pusher: replicacheWrapper<PushRequest, PusherResult>(
      "push",
      channelType,
      workspaceId,
      {
        "x-workspace-id": workspaceId,
        "x-team-id": teamId,
        ...(folderId && { "x-folder-id": folderId }),
      },
    ),
  });
}

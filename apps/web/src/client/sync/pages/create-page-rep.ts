import { Replicache } from "replicache";
import { replicacheWrapper } from "../transport";
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
    mutators: pageMutators,
    pullInterval: null,
    pushURL: undefined,
    pullURL: undefined,
    puller: replicacheWrapper("pull", "page", channelId, {
      "x-workspace-id": workspaceId,
      "x-team-id": teamId,
      "x-folder-id": folderId,
    }),
    pusher: replicacheWrapper("push", "page", channelId, {
      "x-workspace-id": workspaceId,
      "x-team-id": teamId,
      "x-folder-id": folderId,
    }),
  });
}

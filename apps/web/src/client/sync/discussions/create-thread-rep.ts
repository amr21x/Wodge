import { Replicache } from "replicache";
import { replicacheWrapper } from "../transport";
import { createThreadMutators, type ThreadMutators } from "./mutators";

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
  return new Replicache<ThreadMutators>({
    name: `${userId}-${channelId}`,
    mutators: createThreadMutators(userId),
    pullInterval: null,
    pushURL: undefined,
    pullURL: undefined,
    puller: replicacheWrapper("pull", "thread", channelId, {
      "x-workspace-id": workspaceId,
      "x-team-id": teamId,
    }),
    pusher: replicacheWrapper("push", "thread", channelId, {
      "x-workspace-id": workspaceId,
      "x-team-id": teamId,
    }),
  });
}

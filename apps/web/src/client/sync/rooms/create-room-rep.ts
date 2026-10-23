import { Replicache } from "replicache";
import { createRoomMutators, type RoomMutators } from "./mutators";
import { replicacheWrapper } from "../transport";

export function createRoomRep({
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
  return new Replicache<RoomMutators>({
    name: `${userId}-${channelId}`,
    mutators: createRoomMutators(userId),
    pullInterval: null,
    pushURL: undefined,
    pullURL: undefined,
    puller: replicacheWrapper("pull", "room", channelId, {
      "x-workspace-id": workspaceId,
      "x-team-id": teamId,
    }),
    pusher: replicacheWrapper("push", "room", channelId, {
      "x-workspace-id": workspaceId,
      "x-team-id": teamId,
    }),
  });
}

import type { Room } from "livekit-client";
import { toast } from "sonner";

export interface ConnectionParams {
  workspaceId?: string;
  channelId?: string;
  teamId?: string;
  channelName?: string;
  workspaceSlug?: string;
  workspaceName?: string;
  teamName?: string;
}

export interface RoomCall extends ConnectionParams {
  room: Room;
}

// Retain the entry point for callers while media restoration is deferred.
export const connectToRoom = async (
  _parameters: ConnectionParams,
): Promise<RoomCall | undefined> => {
  toast.info(
    "Calls are disabled in this showcase. Room messaging remains available.",
  );
  return undefined;
};

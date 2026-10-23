import type { Room } from "livekit-client";

interface ConnectionParams {
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

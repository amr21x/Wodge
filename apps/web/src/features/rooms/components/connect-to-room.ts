import { jotaiStore } from "@/components/providers";
import { env } from "@wodge/env/client";
import { Room } from "livekit-client";
import {
  callQualityAtom,
  camStatusAtom,
  isSpeakingAtom,
  micDeviceAtom,
  micStatusAtom,
  roomAtom,
  screenStatusAtom,
} from "../state/atoms";
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

export const connectToRoom = async ({
  workspaceId,
  channelId,
  teamId,
  channelName,
  workspaceSlug,
  teamName,
  workspaceName,
}: ConnectionParams) => {
  try {
    if (!workspaceId || !channelId || !teamId || !channelName) {
      return;
    }

    const room = new Room({
      disconnectOnPageLeave: false,
    });

    const resp = await fetch(`/api/rooms/${channelId}/token`, {
      headers: {
        "x-workspace-id": workspaceId,
        "x-team-id": teamId,
      },
    });

    if (!resp.ok) {
      throw new Error("Failed to connect to room");
    }

    const data = await resp.json<{
      token: string;
    }>();

    await room.connect(env.NEXT_PUBLIC_LIVEKIT_URL, data.token);

    room.localParticipant.setMicrophoneEnabled(
      !!jotaiStore.get(micStatusAtom),
      {
        deviceId: jotaiStore.get(micDeviceAtom),
      },
    );

    room.localParticipant.on("localTrackPublished", (e) => {
      e.track?.on("muted", (ex) => {
        if (ex.source === "audio") {
          jotaiStore.set(micStatusAtom, false);
        }

        if (ex.source === "video") {
          jotaiStore.set(camStatusAtom, false);
        }
      });
      e.track?.on("ended", (ex) => {
        if (ex.source === "screen_share") {
          jotaiStore.set(screenStatusAtom, false);
        }
      });
    });

    room.localParticipant.on("isSpeakingChanged", (e) => {
      jotaiStore.set(isSpeakingAtom, e);
    });

    room.localParticipant.on("connectionQualityChanged", (e) => {
      jotaiStore.set(callQualityAtom, e);
    });

    const newRoom: RoomCall = {
      room,
      channelId,
      teamId,
      channelName,
      workspaceId,
      workspaceSlug,
      teamName,
      workspaceName,
    };

    jotaiStore.set(roomAtom, newRoom);

    return newRoom;
  } catch (e) {
    toast.error("Failed to connect to room");
  }
};

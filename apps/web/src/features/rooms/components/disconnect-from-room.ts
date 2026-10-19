import { jotaiStore } from "@/components/providers";
import {
  callQualityAtom,
  camStatusAtom,
  isCarouselOpenAtom,
  isFullScreenAtom,
  isSpeakingAtom,
  roomAtom,
  screenStatusAtom,
} from "../state/atoms";
import { isCallWindowOpenAtom } from "@/client/state/global-atoms";
import { toast } from "sonner";

export const disconnectFromRoom = async () => {
  try {
    const room = jotaiStore.get(roomAtom);

    if (
      jotaiStore.get(isFullScreenAtom) ||
      document.fullscreenElement !== null
    ) {
      document.exitFullscreen();
    }

    await room?.room.disconnect();
    jotaiStore.set(roomAtom, undefined);
    jotaiStore.set(camStatusAtom, false);
    jotaiStore.set(screenStatusAtom, false);
    jotaiStore.set(callQualityAtom, "");
    jotaiStore.set(isSpeakingAtom, false);
    jotaiStore.set(isCarouselOpenAtom, true);
    jotaiStore.set(isFullScreenAtom, false);
    jotaiStore.set(isCallWindowOpenAtom, false);
  } catch (e) {
    toast.error("Failed to disconnect from room");
  }
};

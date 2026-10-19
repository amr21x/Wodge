import { atom } from "jotai";
import { RoomCall } from "../components/connect-to-room";
import { atomWithStorage } from "jotai/utils";

export const isEditing = atom<string>("");

export const isFullScreenAtom = atom<boolean>(false);

export const roomAtom = atom<RoomCall | undefined>(undefined);

export const micStatusAtom = atom<boolean>(true);

export const micDeviceAtom = atomWithStorage<string>("preferredMic", "");

export const camDeviceAtom = atomWithStorage<string>("preferredCam", "");

export const camStatusAtom = atom<boolean>(false);

export const screenStatusAtom = atom<boolean>(false);

export const callQualityAtom = atom<string>("");

export const isSpeakingAtom = atom<boolean>(false);

export const isCarouselOpenAtom = atom<boolean>(true);

export const isMicListOpenAtom = atom<boolean>(false);

export const isCamListOpenAtom = atom<boolean>(false);

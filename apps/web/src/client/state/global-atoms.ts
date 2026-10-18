import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

import { ChannelsTypes } from "@wodge/domain/channels/index";

export interface RecentlyVisitedItem {
  type: ChannelsTypes;
  teamId: string;
  time: string;
  channelId?: string;
  folderId?: string;
}

export const isSidebarOpenAtom = atom(true);

export const isCallWindowOpenAtom = atom(false);

export const recentlyVisitedAtom = atomWithStorage<
  Record<string, RecentlyVisitedItem[]>
>("recentlyVisited", {});

import { ChannelsTypes } from "@wodge/domain/channels/index";
import { atomWithStorage } from "jotai/utils";

export const activeSidebarAtom = atomWithStorage<ChannelsTypes | "home">(
  "activeSidebar",
  "page",
);

export const openTeamsAtom = atomWithStorage<Record<string, boolean>>(
  "openTeams",
  {},
);

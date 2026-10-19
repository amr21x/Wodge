"use client";

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { Replicache } from "replicache";
import type PartySocket from "partysocket";
import { Room } from "livekit-client";
import type { WorkspaceMutators } from "@/client/sync/workspace/mutators";
import { userMutators } from "@/client/sync/user/mutators";
import { pageMutators } from "@/client/sync/pages/mutators";
import type { RoomMutators } from "@/client/sync/rooms/mutators";
import type { ThreadMutators } from "@/client/sync/discussions/mutators";
import { env } from "@wodge/env/client";

import { createSocket } from "./create-socket";
import { createWorkspaceRep } from "./create-workspace-rep";

type ChannelMutators = RoomMutators | ThreadMutators | typeof pageMutators;

export interface AppStore {
  userStore?: Replicache<typeof userMutators>;
  workspaces: Record<string, Replicache<WorkspaceMutators>>;
  activeChanRep?: Replicache<ChannelMutators>;
  socket?: PartySocket;

  actions: {
    addWorkspace: (
      workspace: string,
      userId: string,
    ) => Replicache<WorkspaceMutators>;
    connectSocket: (userId: string) => void;
    getWorkspace: (
      workspaceId: string,
      userId: string,
    ) => Replicache<WorkspaceMutators> | void;
    removeWorkspace: (workspaceId: string) => void;
    setChannelRep: (rep: Replicache<ChannelMutators>) => void;
  };
}

export const useAppStore = create<AppStore>()(
  devtools((set, get) => ({
    userStore: undefined,
    workspaces: {},
    micStatus: true,

    actions: {
      addWorkspace: (workspaceId, userId) => {
        // Closing the current workspace so to account for the case of switching from local to cloud
        if (get().workspaces?.[workspaceId] !== undefined) {
          get().workspaces?.[workspaceId]?.close();
        }

        const rep = createWorkspaceRep(userId, workspaceId);

        set({
          workspaces: {
            ...get().workspaces,
            [workspaceId]: rep,
          },
        });

        return rep;
      },
      getWorkspace: (workspaceId, userId) => {
        if (!workspaceId) {
          return;
        }

        const workspace = get().workspaces[workspaceId];

        if (!workspace) {
          return get().actions.addWorkspace(workspaceId, userId);
        }

        return workspace;
      },
      // Softly delete workspace from the store
      removeWorkspace: async (workspaceId: string) => {
        const workspaces = get().workspaces;

        if (workspaces[workspaceId]) {
          // workaround as close throws an error
          //@ts-ignore
          workspaces[workspaceId]!.puller = undefined;
          //@ts-ignore
          workspaces[workspaceId]!.pusher = undefined;
          // await workspaces[workspaceId]!.close();
        }

        const { workspaceId: _, ...rest } = workspaces;

        set({ ...rest });
      },
      connectSocket: (userId: string) => {
        if (get().socket) {
          return;
        }

        set({ socket: createSocket(userId) });
      },
      setChannelRep: (rep) => {
        set({ activeChanRep: rep });
      },
    },
  })),
);

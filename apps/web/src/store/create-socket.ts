import PartySocket from "partysocket";
import { PokeMessage } from "@wodge/data";
import { env } from "@wodge/env";
import { queryClient } from "@wodge/data/lib/query-client";

import { useAppStore } from "./store";

export function createSocket(userId: string) {
  const socket = new PartySocket({
    host: env.NEXT_PUBLIC_BACKEND_DOMAIN,
    party: "user",
    room: userId,
    // startClosed: true,

    query: async () => ({
      token: await (async () => {
        const res = await fetch(`/api/users/token`);

        if (!res.ok) return "";

        const data = await res.json<{ token: string }>();

        return data.token;
      })(),
    }),
  });

  const userStore = useAppStore.getState().userStore;
  const { addWorkspace, removeWorkspace } = useAppStore.getState().actions;

  socket.addEventListener("message", (e) => {
    const data = JSON.parse(e.data) as { sub: string } & PokeMessage;

    // console.log("socket message", data);

    if (data.sub === "poke") {
      switch (data.type) {
        case "workspace":
          if (!data.id) return;
          const workspaces = useAppStore.getState().workspaces;
          const workspace = workspaces?.[data.id];
          let rep;

          if (!workspace) {
            rep = addWorkspace(data.id, userId);
          }

          queryClient.invalidateQueries({
            queryKey: ["invites", data.id],
          });

          queryClient.invalidateQueries({
            queryKey: ["user-workspaces"],
          });

          return rep ? rep.pull() : workspace?.pull();

        case "channel":
          const repCh = useAppStore.getState().activeChanRep;
          if (repCh && data.id && repCh.name.includes(data.id)) repCh.pull();
          return;

        case "workspaceInfo":
          queryClient.invalidateQueries({
            queryKey: ["invites", data.id],
          });

          return queryClient.invalidateQueries({
            queryKey: ["user-workspaces"],
          });

        case "workspaceMembers":
          const workspaces2 = useAppStore.getState().workspaces;
          if (data.id && workspaces2[data.id]) workspaces2[data.id]?.pull();
          return queryClient.invalidateQueries({
            queryKey: [data.id, "members"],
          });

        case "deleteWorkspace":
          if (!data.id) return;
          removeWorkspace(data.id);

          return queryClient.invalidateQueries({
            queryKey: ["user-workspaces"],
          });

        case "invite":
          return queryClient.invalidateQueries({
            queryKey: ["invites", data.id],
          });

        case "team-files":
          return queryClient.invalidateQueries({
            queryKey: ["resources", data.id, data.teamId],
          });
        default:
          userStore?.pull();
      }
    }
  });

  return socket;
}

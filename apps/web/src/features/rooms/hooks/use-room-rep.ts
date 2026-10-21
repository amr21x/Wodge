import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Replicache } from "replicache";
import type { RoomMutators } from "@/client/sync/rooms/mutators";
import { createRoomRep } from "@/client/sync/rooms/create-room-rep";

import { useCurrentUser } from "../../account/hooks/use-current-user";
import { useCurrentWorkspace } from "@/features/workspace/state/workspace-provider";
import { useAppStore } from "@/client/state/store";

export function useCurrentRoomRep() {
  const { structure, workspaceId } = useCurrentWorkspace();

  const { teamId, channelId } = useParams<{
    teamId: string;
    channelId: string;
  }>();

  const { setChannelRep } = useAppStore().actions;

  const { user } = useCurrentUser();

  const [rep, setRep] = useState<Replicache<RoomMutators> | undefined>(
    undefined,
  );

  const team = useMemo(() => {
    return structure.teams.find((t) => t.id === teamId);
  }, [teamId, structure.teams]);

  const channel = useMemo(() => {
    return team?.rooms.find((r) => r.id === channelId);
  }, [team, channelId]);

  const userId = user?.id;
  const exists = !!team && !!channel;
  useEffect(() => {
    setRep(undefined);
    if (!workspaceId || !exists || !userId) return;
    const instance = createRoomRep({
      channelId,
      workspaceId,
      teamId,
      userId,
    });
    setRep(instance);
    const unregister = setChannelRep(instance);
    return () => {
      unregister();
      void instance.close();
    };
  }, [workspaceId, teamId, channelId, userId, exists, setChannelRep]);

  return userId && exists && rep?.name === `${userId}-${channelId}`
    ? rep
    : undefined;
}

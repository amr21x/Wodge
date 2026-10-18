import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Replicache } from "replicache";
import { roomMutators } from "@/client/sync/rooms/mutators";
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

  const [rep, setRep] = useState<Replicache<typeof roomMutators> | undefined>(
    undefined,
  );

  const team = useMemo(() => {
    return structure.teams.find((t) => t.id === teamId);
  }, [teamId, structure.teams]);

  const channel = useMemo(() => {
    return team?.rooms.find((r) => r.id === channelId);
  }, [team, channelId]);

  useEffect(() => {
    if (workspaceId && team && channel && user && !rep) {
      const repTemp = createRoomRep({
        channelId: channel.id,
        workspaceId,
        teamId: team.id,
        userId: user.id,
      });

      setRep(repTemp);
      setChannelRep(repTemp);
    }
  }, [workspaceId, team, channel, structure.teams, user]);

  return rep;
}

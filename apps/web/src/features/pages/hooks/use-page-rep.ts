import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Replicache } from "replicache";
import { pageMutators } from "@/client/sync/pages/mutators";
import { createPageRep } from "@/client/sync/pages/create-page-rep";
import { useCurrentUser } from "../../account/hooks/use-current-user";
import { useCurrentWorkspace } from "@/features/workspace/state/workspace-provider";
import { useAppStore } from "@/client/state/store";

export function useCurrentPageRep() {
  const { structure, workspaceId } = useCurrentWorkspace();

  const { teamId, channelId, folderId } = useParams<{
    teamId: string;
    channelId: string;
    folderId: string;
  }>();

  const { setChannelRep } = useAppStore().actions;

  const { user } = useCurrentUser();

  const [rep, setRep] = useState<Replicache<typeof pageMutators> | undefined>(
    undefined,
  );

  const team = useMemo(() => {
    return structure.teams.find((t) => t.id === teamId);
  }, [teamId, structure.teams]);

  const folder = useMemo(() => {
    return team?.folders.find((r) => r.id === folderId);
  }, [team, folderId]);

  const channel = useMemo(() => {
    return folder?.channels.find((c) => c.id === channelId);
  }, [folder, channelId]);

  const userId = user?.id;
  const exists = !!team && !!channel;
  useEffect(() => {
    setRep(undefined);
    if (!workspaceId || !exists || !userId) return;
    const instance = createPageRep({
      channelId,
      workspaceId,
      teamId,
      userId,
      folderId,
    });
    setRep(instance);
    setChannelRep(instance);
    return () => {
      if (useAppStore.getState().activeChanRep === instance)
        useAppStore.setState({ activeChanRep: undefined });
      void instance.close();
    };
  }, [workspaceId, teamId, channelId, userId, exists, setChannelRep, folderId]);

  return userId && exists && rep?.name === `${userId}-${channelId}`
    ? rep
    : undefined;
}

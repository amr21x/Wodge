"use client";

import { useEffect, useMemo, useState } from "react";
import { useActions } from "../../../client/state/store-hooks";
import { useCurrentUser } from "../../account/hooks/use-current-user";
import { ReadTransaction, Replicache } from "replicache";
import { useUserWorkspaces } from "./use-user-workspaces";
import { useSubscribe } from "../../../client/sync/use-subscribe";
import {
  WorkspaceMembers,
  WorkspaceStructure,
} from "@wodge/domain/workspace/models";
import {
  makeWorkspaceMembersKey,
  makeWorkspaceStructureKey,
} from "@wodge/domain/sync/index";

import type { WorkspaceMutators } from "@/client/sync/workspace/mutators";
import { useParams } from "next/navigation";

export function useWorkspaceSubscription() {
  const [workspaceRep, setWorkspaceRep] =
    useState<Replicache<WorkspaceMutators> | null>(null);

  const { workspaceSlug } = useParams() as { workspaceSlug: string };

  const { user, isUserPending } = useCurrentUser();
  const { getWorkspace } = useActions();
  const { userWorkspaces, isUserWorkspacesPending } = useUserWorkspaces();

  const workspace = useMemo(
    () => userWorkspaces?.find((w) => w.slug === workspaceSlug),
    [userWorkspaces, workspaceSlug],
  );

  const workspaceId = workspace?.id;

  const isPending = isUserPending || isUserWorkspacesPending;

  useEffect(() => {
    setWorkspaceRep(null);
    if (isPending || !user || !workspaceId) return;

    const workspaceStore = getWorkspace(workspaceId, user.id);

    if (!workspaceStore) {
      return;
    }

    setWorkspaceRep(workspaceStore);
  }, [user, workspaceSlug, workspace, isPending, getWorkspace, workspaceId]);

  const currentRep =
    user && workspaceId && workspaceRep?.name === `${user.id}-${workspaceId}`
      ? workspaceRep
      : null;

  const { snapshot: structure, isPending: isStructurePending } = useSubscribe(
    currentRep,
    (tx: ReadTransaction) => {
      return tx.get<WorkspaceStructure>(makeWorkspaceStructureKey());
    },
    {
      default: { teams: [] },
    },
  );

  const { snapshot: members, isPending: isMembersPending } = useSubscribe(
    currentRep,
    (tx: ReadTransaction) => {
      return tx.get<WorkspaceMembers>(makeWorkspaceMembersKey());
    },
    {
      default: { createdBy: "", members: [] },
    },
  );

  return {
    workspaceRep: currentRep,
    structure: currentRep ? structure : { teams: [] },
    workspace,
    isStructurePending,
    members: currentRep ? members : { createdBy: "", members: [] },
    isMembersPending,
    workspaceId,
    workspaceSlug,
  };
}

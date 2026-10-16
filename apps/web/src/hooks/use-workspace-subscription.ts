"use client";

import { useEffect, useMemo, useState } from "react";
import { useActions } from "../store/store-hooks";
import { useCurrentUser } from "./use-current-user";
import { ReadTransaction, Replicache } from "replicache";
import { useUserWorkspaces } from "./use-user-workspaces";
import { useSubscribe } from "./use-subscribe";
import {
  WorkspaceMembers,
  WorkspaceStructure,
  defaultWorkspaceMembers,
  defaultWorkspaceStructure,
  makeWorkspaceMembersKey,
  makeWorkspaceStructureKey,
} from "@wodge/data";

import { workspaceMutators } from "@wodge/data/models/workspace/workspace-mutators";
import { useParams, usePathname, useRouter } from "next/navigation";

export function useWorkspaceSubscription() {
  const [workspaceRep, setWorkspaceRep] = useState<Replicache<
    typeof workspaceMutators
  > | null>(null);
  const router = useRouter();

  const pathname = usePathname();

  const isNotConcerned =
    pathname.startsWith("/login") ||
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/settings") ||
    pathname.split("/").at(2) === "join";

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
    if (isPending) return;

    let timerId: any;
    // if (!workspace && !isNotConcerned) {
    //   timerId = setTimeout(() => {
    //     router.push("/");
    //   }, 3000);
    // }
    // return;

    // if (workspaceRep && workspaceRep.name.includes(workspaceId)) return;

    if (!user || !workspaceId) return;

    const workspaceStore = getWorkspace(workspaceId, user.id);

    if (!workspaceStore) return;

    setWorkspaceRep(workspaceStore);

    return () => {
      if (timerId) clearTimeout(timerId);
    };
  }, [user, workspaceSlug, workspace, isPending]);

  const { snapshot: structure, isPending: isStructurePending } = useSubscribe(
    workspaceRep,
    (tx: ReadTransaction) => {
      // console.log("will sub 1");

      return tx.get<WorkspaceStructure>(makeWorkspaceStructureKey());
    },
    {
      default: defaultWorkspaceStructure(),
    },
  );

  const { snapshot: members, isPending: isMembersPending } = useSubscribe(
    workspaceRep,
    (tx: ReadTransaction) => {
      // console.log("will sub 2");

      return tx.get<WorkspaceMembers>(makeWorkspaceMembersKey());
    },
    {
      default: defaultWorkspaceMembers(),
    },
  );

  return {
    workspaceRep,
    structure,
    workspace,
    isStructurePending,
    members,
    isMembersPending,
    workspaceId,
    workspaceSlug,
  };
}

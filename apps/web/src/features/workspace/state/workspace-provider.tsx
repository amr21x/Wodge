import { Replicache } from "replicache";
import { createContext, useContext } from "react";

import { DrObj } from "@wodge/domain/types";
import {
  Workspace,
  WorkspaceMembers,
  WorkspaceStructure,
} from "@wodge/domain/workspace/models";

import { workspaceMutators } from "@/client/sync/workspace/mutators";
import { useWorkspaceSubscription } from "@/features/workspace/hooks/use-workspace-subscription";

interface WorkspaceContextProps {
  workspaceRep: Replicache<typeof workspaceMutators> | null;
  workspace: Workspace | undefined;
  structure: DrObj<WorkspaceStructure>;
  members: DrObj<WorkspaceMembers>;
  workspaceId: string | undefined;
  workspaceSlug: string | undefined;
  isStructurePending: boolean;
  isMembersPending: boolean;
}

export const WorkspaceContext = createContext<
  WorkspaceContextProps | undefined
>(undefined);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const workspaceInfo = useWorkspaceSubscription();

  return (
    <WorkspaceContext.Provider value={workspaceInfo}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useCurrentWorkspace() {
  const context = useContext(WorkspaceContext);

  if (!context) {
    throw new Error(
      "useCurrentWorkspace must be used within a WorkspaceProvider",
    );
  }

  return context;
}

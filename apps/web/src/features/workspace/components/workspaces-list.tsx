import { WorkspaceItem } from "./workspace-item";
import { useUserWorkspaces } from "@/features/workspace/hooks/use-user-workspaces";

export function WorkspacesList() {
  const { userWorkspaces, isUserWorkspacesPending } = useUserWorkspaces();

  if (isUserWorkspacesPending) {
    return (
      <div className="w-full">
        {Array.from({ length: 4 }).map((_, i) => (
          <WorkspaceItem.Skeleton key={i} />
        ))}
      </div>
    );
  }

  if (
    !isUserWorkspacesPending &&
    (userWorkspaces?.length === 0 || !userWorkspaces)
  ) {
    return (
      <p className="p-5 text-center text-muted-foreground">
        Join or create workspace to start using Wodge
      </p>
    );
  }

  return (
    <div className="flex h-full w-full flex-col divide-y-[1px] divide-border/50">
      {userWorkspaces &&
        Object.values(userWorkspaces)?.map((workspace) => (
          <WorkspaceItem key={workspace.id} workspace={workspace} />
        ))}
    </div>
  );
}

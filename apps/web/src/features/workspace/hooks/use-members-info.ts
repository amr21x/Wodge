import { useQuery } from "@tanstack/react-query";
import { env } from "@wodge/env/client";
import { PublicUserType } from "@wodge/domain/user/models";
import { useCurrentWorkspace } from "@/features/workspace/state/workspace-provider";

export function useMembersInfo() {
  const { workspaceId } = useCurrentWorkspace();

  const { data, isPending, isError } = useQuery({
    queryKey: [workspaceId, "members"],
    queryFn: async () => {
      const res = await fetch(`/api/workspaces/${workspaceId}/members`);

      if (!res.ok) {
        throw new Error("Failed to fetch members data");
      }

      const data = (await res.json()) as PublicUserType[];

      return data;
    },
    enabled: !!workspaceId,
  });

  if (isError) {
    console.error("Failed to fetch members data");
  }

  return { membersInfo: data || [], isMembersPending: isPending };
}

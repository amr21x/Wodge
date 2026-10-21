import { requireOk } from "@/client/errors";
import { useQuery } from "@tanstack/react-query";

import { PublicUserType } from "@wodge/domain/user/models";
import { useCurrentWorkspace } from "@/features/workspace/state/workspace-provider";

export function useMembersInfo() {
  const { workspaceId } = useCurrentWorkspace();

  const { data, isPending, isError } = useQuery({
    queryKey: [workspaceId, "members"],
    queryFn: async () => {
      const res = await fetch(`/api/workspaces/${workspaceId}/members`);

      await requireOk(res);

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

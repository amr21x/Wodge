"use client";

import { Invite } from "@wodge/domain/workspace/models";

import { useCurrentWorkspace } from "@/features/workspace/state/workspace-provider";
import { useQuery } from "@tanstack/react-query";
import { requireOk } from "@/client/errors";

export function useInvites() {
  const { workspaceId } = useCurrentWorkspace();

  const {
    data: invites,
    isPending,
    error,
  } = useQuery<Invite[]>({
    queryKey: ["invites", workspaceId],
    queryFn: async () => {
      const res = await fetch(`/api/workspaces/${workspaceId}/invite`);

      await requireOk(res);
      const data = await res.json<{ invites?: Invite[] }>();

      return data?.invites || [];
    },
    enabled: !!workspaceId,
    staleTime: 0,
  });

  return { invites, error, isLinkLoading: isPending };
}

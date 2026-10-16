"use client";

import { Invite, Invites } from "@wodge/data";
import { env } from "@wodge/env";
import { useCurrentWorkspace } from "@/components/workspace-provider";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

function getInviteLink(invites?: Invites): Invite | undefined {
  if (!invites) return;
  const invite: [string, Invite] | undefined = Object.entries(invites).find(
    ([k, v]) => v.method === "link",
  );

  if (!invite) return;

  return invite[1];
}

export function useInvites() {
  const { workspaceId } = useCurrentWorkspace();

  const {
    data: invites,
    isPending,
    isError,
  } = useQuery<Invite[]>({
    queryKey: ["invites", workspaceId],
    queryFn: async () => {
      const res = await fetch(`/api/workspaces/${workspaceId}/invite`);

      const data = await res.json<{ invites?: Invite[] }>();

      return data?.invites || [];
    },
    enabled: !!workspaceId,
    staleTime: 0,
  });

  if (isError) toast.error("Failed to fetch invites");

  // const inviteLink = getInviteLink(invites);

  return { invites, isLinkLoading: isPending };
}

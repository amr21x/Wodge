import { env } from "@wodge/env/client";
import { useState } from "react";
import { Check, Copy, RefreshCcw, Repeat } from "lucide-react";
import { useCurrentWorkspace } from "@/features/workspace/state/workspace-provider";
import { useInvites } from "./use-invites";
import { TooltipWrapper } from "@/components/tooltip-wrapper";
import { SidebarItemBtn } from "@/features/workspace/components/sidebar-item-btn";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

function makeLink(token?: string, wid?: string) {
  return `${env.NEXT_PUBLIC_APP_DOMAIN}/${wid}/join/${token}`;
}

export function InviteLink() {
  const { invites, isLinkLoading } = useInvites();

  const { workspaceId, workspace } = useCurrentWorkspace();
  const [copied, setCopied] = useState(false);
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      await fetch(`/api/workspaces/${workspaceId}/invite`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["invites", workspaceId],
      });
      toast.success("Invite link reset successfully");
    },
  });

  if (!workspaceId) {
    return null;
  }

  if (!workspace?.isInviteLinkEnabled) {
    return null;
  }

  const inviteLink = invites?.find((i) => !i.emails);

  return (
    <div className="flex w-full items-center justify-between gap-6 overflow-hidden rounded-md bg-accent p-3">
      <div className="truncate text-sm">
        {isLinkLoading ? (
          <Skeleton className="h-4 w-11/12 max-w-lg" />
        ) : (
          <div className="flex">
            <p>{makeLink(inviteLink?.token, inviteLink?.workspaceId)}</p>
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center justify-end gap-1">
        <TooltipWrapper content="Reset invite link">
          <SidebarItemBtn
            Icon={RefreshCcw}
            onClick={() => mutate()}
            disabled={isPending}
          />
        </TooltipWrapper>
        <TooltipWrapper content="Copy invite link">
          <SidebarItemBtn
            Icon={copied ? Check : Copy}
            disabled={copied}
            onClick={() => {
              navigator.clipboard.writeText(
                makeLink(inviteLink?.token, inviteLink?.workspaceId) || "",
              );
              toast.success("Invite link copied to clipboard");
              setCopied(true);
              setTimeout(() => setCopied(false), 1000);
            }}
          />
        </TooltipWrapper>
      </div>
    </div>
  );
}

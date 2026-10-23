import { failureMessage, requireOk } from "@/client/errors";
import { useIsOwnerOrAdmin } from "@/features/workspace/hooks/use-is-owner-or-admin";
import { SettingsContentAction } from "./settings";
import { useIsOwner } from "@/features/workspace/hooks/use-is-owner";

import { useCurrentWorkspace } from "@/features/workspace/state/workspace-provider";
import { toast } from "@/components/ui/toast";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function WorkspaceDangerZone() {
  useIsOwnerOrAdmin();
  const isOwner = useIsOwner();
  const { workspaceId } = useCurrentWorkspace();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/workspaces/${workspaceId}/leave`, {
        method: "POST",
      });

      await requireOk(res);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["user-workspaces"],
      });
      router.push("/");
    },
    onError: (error) => {
      toast.error(failureMessage(error));
    },
  });

  const { mutate: deleteWorkspace, isPending: isDeleting } = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/workspaces/${workspaceId}`, {
        method: "DELETE",
      });

      await requireOk(res);
    },
    onSuccess: () => {
      router.push("/");
    },
    onError: (error) => {
      toast.error(failureMessage(error));
    },
  });

  return (
    <div className="flex gap-4">
      {!isOwner && (
        <SettingsContentAction
          variant="destructive"
          onClick={() => mutate()}
          isPending={isPending}
          className="w-32"
        >
          Leave Workspace
        </SettingsContentAction>
      )}

      {isOwner && (
        <SettingsContentAction
          variant="destructive"
          className="w-32"
          onClick={() => deleteWorkspace()}
          isPending={isDeleting}
        >
          Delete Workspace
        </SettingsContentAction>
      )}
    </div>
  );
}

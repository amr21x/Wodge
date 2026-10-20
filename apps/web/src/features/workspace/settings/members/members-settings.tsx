"use client";

import { failureMessage, requireOk } from "@/client/errors";
import { refreshPermissions } from "@/client/permissions";

import { SettingsContentHeader, SettingsContentSection } from "../settings";

import { InviteLink } from "./invite-sections";
import { useTable } from "../use-table";
import { membersColumns } from "./members-columns";
import { Mutable } from "@/lib/utils/index";
import { DrObj } from "@wodge/domain/types";
import { Member } from "@wodge/domain/workspace/models";
import { SettingsSearchInput } from "../settings-search-input";
import { DataTable } from "@/components/data-table/data-table";
import { useCurrentWorkspace } from "@/features/workspace/state/workspace-provider";

import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function MembersSettings() {
  const { members, workspaceId, workspace } = useCurrentWorkspace();

  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: async (_c: boolean) => {
      const response = await fetch(`/api/workspaces/${workspaceId}/invite`, {
        method: "PATCH",
      });
      await requireOk(response);
    },
    onError: (error) => toast.error(failureMessage(error)),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["user-workspaces"],
      });
    },
  });

  const { table } = useTable({
    data: (members?.members as Mutable<DrObj<Member>[]>) || [],
    columns: membersColumns({ changeMemberRole, removeMember, workspaceId }),
  });

  const nMembers = table.getFilteredRowModel().rows.length;

  async function removeMember(memberId: string) {
    try {
      const response = await fetch(
        `/api/workspaces/${workspaceId}/members/${memberId}`,
        { method: "DELETE" },
      );
      await requireOk(response);
      refreshPermissions({ revoke: true });
      void queryClient.invalidateQueries({
        queryKey: [workspaceId, "members"],
      });
    } catch (error) {
      toast.error(failureMessage(error));
    }
  }

  async function changeMemberRole(memberId: string, role: Member["role"]) {
    try {
      const response = await fetch(
        `/api/workspaces/${workspaceId}/members/${memberId}/role`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ role }),
        },
      );
      await requireOk(response);
      refreshPermissions({ revoke: true });
    } catch (error) {
      toast.error(failureMessage(error));
    }
  }

  if (!workspace) {
    return null;
  }

  return (
    <div className="w-full shrink-0 grow divide-y-[1px] divide-border/70">
      <SettingsContentHeader
        label="Members settings"
        description="Manage members in this workspace"
      />

      <SettingsContentSection
        header="Invite Link"
        action={
          <Switch
            defaultChecked={workspace?.isInviteLinkEnabled || false}
            onCheckedChange={mutate}
            checked={workspace?.isInviteLinkEnabled || false}
            disabled={isPending}
            className="disabled:cursor-progress"
          />
        }
      >
        <InviteLink />
      </SettingsContentSection>

      <SettingsContentSection header="Manage Members">
        <div className="space-y-4">
          <SettingsSearchInput
            table={table}
            searchColumn="member"
            placeHolder="Search by email, username, or name"
          />

          {nMembers > 0 && (
            <p className="text-xs">
              {nMembers > 1 ? `${nMembers} members` : `1 member`}
            </p>
          )}

          <DataTable table={table} placeholder="No members found" />
        </div>
      </SettingsContentSection>
    </div>
  );
}

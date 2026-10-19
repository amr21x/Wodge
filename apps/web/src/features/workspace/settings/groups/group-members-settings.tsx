import { GeneralMembersTable } from "../general-members-table";
import { useTable } from "../use-table";

import { DrObj } from "@wodge/domain/types";
import { Group } from "@wodge/domain/workspace/models";
import { useCurrentWorkspace } from "@/features/workspace/state/workspace-provider";

import { useMemo } from "react";
import { groupMembersColumns } from "./group-members-columns";
import { toast } from "sonner";

export function GroupMembersSettings({ group }: { group?: DrObj<Group> }) {
  const { members, workspaceRep, workspaceId } = useCurrentWorkspace();

  const nonGroupMembers = useMemo(() => {
    return members.members.filter(
      (member) => !group?.members.includes(member.id),
    );
  }, [members, group?.members]);

  const { table } = useTable({
    data: (group?.members || []) as string[],
    columns: groupMembersColumns({
      creatorId: group?.createdBy,
      removeMember,
      workspaceId,
    }),
  });

  async function removeMember(memberId: string) {
    try {
      if (!group) {
        return;
      }

      await workspaceRep?.mutate.updateGroup({
        groupId: group.id,
        groupUpdate: {
          action: "removeMembers",
          update: {
            members: [memberId],
          },
        },
      });
    } catch {
      toast.error("Remove member failed");
    }
  }

  async function addMember(memberId: string) {
    try {
      if (!group) {
        return;
      }

      await workspaceRep?.mutate.updateGroup({
        groupId: group.id,
        groupUpdate: {
          action: "addMembers",
          update: {
            members: [memberId],
          },
        },
      });
    } catch {
      toast.error("Add member failed");
    }
  }

  return (
    <GeneralMembersTable
      table={table}
      members={nonGroupMembers}
      addMember={addMember}
    />
  );
}

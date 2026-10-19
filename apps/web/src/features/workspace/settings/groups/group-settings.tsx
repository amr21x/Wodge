"use client";

import * as React from "react";
import { SettingsContentHeader, SettingsContentSection } from "../settings";
import { DrObj } from "@wodge/domain/types";
import { Group } from "@wodge/domain/workspace/models";

import { GroupMembersSettings } from "./group-members-settings";
import { GroupGeneralForm } from "./group-general-form";

import { useCurrentWorkspace } from "@/features/workspace/state/workspace-provider";
import { useMember } from "@/features/workspace/hooks/use-member";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";

export function GroupSettings({
  group,
  isAddition = false,
}: {
  group?: DrObj<Group>;
  isAddition?: boolean;
}) {
  const { workspaceRep } = useCurrentWorkspace();

  const { member } = useMember(group?.createdBy || "");

  async function deleteGroup() {
    if (!group) {
      return;
    }

    try {
      await workspaceRep?.mutate.deleteGroup(group.id);
      toast.success("Group deleted");
    } catch {
      toast.error("Failed to delete group");
    }
  }

  return (
    <div className="w-full shrink-0 grow divide-y-[1px] divide-border/70">
      <SettingsContentHeader
        label={`${isAddition ? "Add a new group" : group?.name + " settings"}`}
        description={`${isAddition ? "Create a new group" : "Manage group settings"}`}
        {...(!isAddition && { footer: `Created by ${member?.email}` })}
      />

      <p role="note" className="p-4 text-sm text-muted-foreground">
        These are legacy groups. Adding or removing members, or deleting a
        group, does not grant or revoke room access. Manage room access through
        workspace roles and permissions; remove role assignments to revoke
        existing access.
      </p>

      <SettingsContentSection header="general">
        <GroupGeneralForm group={group} />
      </SettingsContentSection>

      {!isAddition && (
        <>
          <SettingsContentSection header="manage members">
            <GroupMembersSettings group={group} />
          </SettingsContentSection>

          <SettingsContentSection header="Danger Zone">
            <Button size="sm" variant="destructive" onClick={deleteGroup}>
              Delete Group
            </Button>
          </SettingsContentSection>
        </>
      )}
    </div>
  );
}

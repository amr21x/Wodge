import { workspaceError } from "@wodge/core/workspace/errors";
import { updateGroupInfoMutation } from "@wodge/core/workspace/mutations/group-info";
import {
  addGroupMembersMutation,
  removeGroupMembersMutation,
} from "@wodge/core/workspace/mutations/group-members";
import { WorkspaceGroupMutation } from "@wodge/core/workspace/mutations/types";
import type { WorkspaceInputs } from "@wodge/domain/workspace/dto";

export type GroupUpdate = WorkspaceInputs["updateGroup"]["groupUpdate"];

export interface GroupUpdateRunnerArgs extends WorkspaceGroupMutation {
  groupUpdate: GroupUpdate;
  curMembers: string[];
}

export function groupUpdateRunner({
  groupUpdate,
  structure,
  groupId,
  curMembers,
}: GroupUpdateRunnerArgs) {
  if (!groupUpdate.action) {
    throw workspaceError("WORKSPACE_INVALID_INPUT", "Invalid update action");
  }

  const { action, update } = groupUpdate;

  switch (action) {
    case "updateInfo":
      return updateGroupInfoMutation({ update, groupId, structure });

    case "addMembers":
      return addGroupMembersMutation({
        update,
        groupId,
        structure,
        curMembers,
      });

    case "removeMembers":
      return removeGroupMembersMutation({ update, groupId, structure });

    default:
      throw workspaceError("WORKSPACE_INVALID_INPUT", "Invalid update action");
  }
}

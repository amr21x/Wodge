import { workspaceError } from "@wodge/core/workspace/errors";
import { WorkspaceGroupMutation } from "@wodge/core/workspace/mutations/types";
import { WorkspaceStructure } from "@wodge/domain/workspace/models";
import { produce } from "immer";

export function deleteGroupMutation({
  structure,
  groupId,
}: WorkspaceGroupMutation) {
  // 1. check if the group not existing
  const groupExists = structure.groups.some((g) => g.id === groupId);

  if (!groupExists) {
    throw workspaceError("WORKSPACE_NOT_FOUND", "Group not found");
  }

  // 2. Delete the group

  const newStructure = produce(structure, (draft) => {
    draft.groups = draft.groups.filter((g) => g.id !== groupId);
  });

  return newStructure as WorkspaceStructure;
}

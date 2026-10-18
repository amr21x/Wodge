import { workspaceError } from "@wodge/core/workspace/errors";
import { WorkspaceTeamMutation } from "@wodge/core/workspace/mutations/types";
import { WorkspaceStructure } from "@wodge/domain/workspace/models";
import { produce } from "immer";

export function deleteTeamMutation({
  structure,
  teamId,
}: WorkspaceTeamMutation) {
  if (structure.teams.length === 1) {
    throw workspaceError("WORKSPACE_CONFLICT", "Cannot delete the last team");
  }
  // 1. check if the team not existing

  const teamExists = structure.teams.some((t) => t.id === teamId);

  if (!teamExists) {
    throw workspaceError("WORKSPACE_NOT_FOUND", "Team not found");
  }

  // 2. Delete the team

  const newStructure = produce(structure, (draft) => {
    draft.teams = draft.teams.filter((t) => t.id !== teamId);
  });

  return newStructure as WorkspaceStructure;
}

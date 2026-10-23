import { workspaceError } from "./errors";
import { changeTeamMemberRoleMutation } from "./change-team-member-role";
import {
  addTeamFolderMutation,
  deleteTeamFoldersMutation,
} from "./team-folders";
import { updateTeamInfoMutation } from "./team-info";
import { addTeamMembersMutation, removeTeamMembers } from "./team-members";
import { WorkspaceTeamMutation } from "./types";
import { DrObj } from "@wodge/domain/types";
import type { WorkspaceInputs } from "@wodge/domain/workspace/dto";
import { WorkspaceStructure } from "@wodge/domain/workspace/models";

type TeamUpdate = WorkspaceInputs["updateTeam"]["teamUpdate"];

interface TeamUpdateRunnerArgs extends WorkspaceTeamMutation {
  teamUpdate: TeamUpdate;
  curMembers?: string[];
}

export function teamUpdateRunner({
  teamUpdate,
  structure,
  teamId,
  curMembers,
}: TeamUpdateRunnerArgs): WorkspaceStructure | DrObj<WorkspaceStructure> {
  if (!teamUpdate.action) {
    throw workspaceError("WORKSPACE_INVALID_INPUT", "Invalid update action");
  }

  const { action, update } = teamUpdate;

  switch (action) {
    case "updateInfo":
      return updateTeamInfoMutation({ update, teamId, structure });

    case "addMembers":
      if (!curMembers) {
        throw workspaceError(
          "WORKSPACE_INVALID_INPUT",
          "Current members are required for adding members",
        );
      }
      return addTeamMembersMutation({
        update,
        teamId,
        structure,
        curMembers,
      });

    case "removeMembers":
      return removeTeamMembers({ update, teamId, structure });

    case "changeTeamMemberRole":
      return changeTeamMemberRoleMutation({
        update,
        teamId,
        structure,
      });

    case "addFolder":
      return addTeamFolderMutation({ update, teamId, structure });

    case "removeFolders":
      return deleteTeamFoldersMutation({ update, teamId, structure });

    default:
      throw workspaceError("WORKSPACE_INVALID_INPUT", "Invalid update action");
  }
}

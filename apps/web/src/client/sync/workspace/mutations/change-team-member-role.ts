import { workspaceError } from "./errors";
import { WorkspaceTeamMutation } from "./types";
import { WorkspaceStructure } from "@wodge/domain/workspace/models";
import { produce } from "immer";

interface ChangeTeamMemberRoleMutationArgs extends WorkspaceTeamMutation {
  update: {
    memberId: string;
    role: "teamMember" | "moderator";
  };
}

export function changeTeamMemberRoleMutation({
  update,
  teamId,
  structure,
}: ChangeTeamMemberRoleMutationArgs) {
  const { role, memberId } = update;

  const team = structure.teams.find((t) => t.id === teamId);

  if (!team) {
    throw workspaceError("WORKSPACE_NOT_FOUND", "Team not found");
  }

  const teamIdx = structure.teams.findIndex((t) => t.id === teamId);

  if (teamIdx === -1) {
    throw workspaceError("WORKSPACE_NOT_FOUND", "Member not found");
  }

  if (role !== "moderator" && role !== "teamMember") {
    throw workspaceError("WORKSPACE_INVALID_INPUT", "Invalid role");
  }

  return produce(structure, (draft) => {
    const team = draft.teams[teamIdx]!;

    if (role === "moderator") {
      team.moderators.push(memberId);
    } else {
      team.moderators = team.moderators.filter((m) => m !== memberId);
    }
  }) as WorkspaceStructure;
}

import { workspaceError } from "./errors";
import { WorkspaceTeamMutation } from "./types";
import { WorkspaceStructure } from "@wodge/domain/workspace/models";
import { produce } from "immer";

export function deleteFolderMutation({
  structure,
  teamId,
  folderId,
}: WorkspaceTeamMutation & { folderId: string }) {
  const newStructure = produce(structure, (draft) => {
    // Check if the team not existing
    const teamIdx = draft.teams.findIndex((t) => t.id === teamId);

    if (teamIdx === -1) {
      throw workspaceError("WORKSPACE_NOT_FOUND", "Team not found");
    }

    const team = draft.teams[teamIdx]!;

    const folderIdx = team.folders.findIndex((f) => f.id === folderId);

    if (folderIdx === -1) {
      throw workspaceError("WORKSPACE_NOT_FOUND", "Folder not found");
    }

    draft.teams[teamIdx]!.folders = team.folders.filter(
      (f) => f.id !== folderId,
    );
  });

  return newStructure as WorkspaceStructure;
}

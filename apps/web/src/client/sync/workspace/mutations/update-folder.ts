import { workspaceError } from "./errors";
import { DrObj } from "@wodge/domain/types";
import { Folder, WorkspaceStructure } from "@wodge/domain/workspace/models";
import { FolderSchema } from "@wodge/domain/workspace/validation";
import { produce } from "immer";

interface CreateTeamArgs {
  folder: Folder;
  teamId: string;
  structure: WorkspaceStructure | DrObj<WorkspaceStructure>;
}

export function updateFolderMutation({
  folder,
  teamId,
  structure,
}: CreateTeamArgs) {
  // Validate the data
  const validateFields = FolderSchema.safeParse(folder);

  if (!validateFields.success) {
    throw workspaceError("WORKSPACE_INVALID_INPUT", "Invalid folder data");
  }

  const { data: newFolder } = validateFields;

  const newStructure = produce(structure, (draft) => {
    const team = draft.teams.find((t) => t.id === teamId);
    // Check if team not found

    if (!team) {
      throw workspaceError("WORKSPACE_NOT_FOUND", "Team not found");
    }
    // Check if folder not found

    const folderIdx = team.folders.findIndex((ch) => ch.id === newFolder.id);

    if (folderIdx === -1) {
      throw workspaceError("WORKSPACE_NOT_FOUND", "folder not found");
    } else {
      team.folders[folderIdx]! = newFolder; // Add page
    }
  });

  return newStructure as WorkspaceStructure;
}

import { workspaceError } from "@wodge/core/workspace/errors";
import { WorkspaceTeamMutation } from "@wodge/core/workspace/mutations/types";
import { Folder } from "@wodge/domain/workspace/models";
import { FolderSchema } from "@wodge/domain/workspace/validation";
import { produce } from "immer";

interface UpdateTeamDirArgs extends WorkspaceTeamMutation {
  update: { folder: Folder };
}

export function addTeamFolderMutation({
  structure,
  update,
  teamId,
}: UpdateTeamDirArgs) {
  // 1. Validate the update request
  const validatedFields = FolderSchema.safeParse({
    ...update.folder,
    channels: [],
  });

  if (!validatedFields.success) {
    throw workspaceError("WORKSPACE_INVALID_INPUT", "Invalid team update data");
  }

  const { data: folder } = validatedFields;

  // 2. Check if team already exists
  const teamIdx = structure.teams.findIndex((t) => t.id === teamId);

  if (teamIdx === -1) {
    throw workspaceError("WORKSPACE_NOT_FOUND", "Team does not exist");
  }

  if (structure.teams[teamIdx]!.folders.some((f) => f.id === folder.id)) {
    throw workspaceError("WORKSPACE_CONFLICT", "Folder already exists in team");
  }

  if (folder.parentFolder) {
    if (
      !structure.teams[teamIdx]!.folders.some(
        (f) => f.id === folder.parentFolder,
      )
    ) {
      throw workspaceError(
        "WORKSPACE_NOT_FOUND",
        "Parent folder does not exist in team",
      );
    }
  }

  // 3. Update the dirs

  const newStructure = produce(structure, (draft) => {
    draft.teams[teamIdx]!.folders.push(folder);
  });

  return newStructure;
}

export function deleteTeamFoldersMutation({
  structure,
  update,
  teamId,
}: WorkspaceTeamMutation & { update: { folders: string[] } }) {
  // 1. Check if team already exists
  const teamIdx = structure.teams.findIndex((t) => t.id === teamId);

  if (teamIdx === -1) {
    throw workspaceError("WORKSPACE_NOT_FOUND", "Team does not exist");
  }

  // const removalIds = update.map((dir) => dir.id);

  // 2. Update the folders

  const newStructure = produce(structure, (draft) => {
    const curTeam = draft.teams[teamIdx]!;

    curTeam.folders = curTeam.folders.filter(
      (f) => !update.folders.includes(f.id),
    );
  });

  return newStructure;
}

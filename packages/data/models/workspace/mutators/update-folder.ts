import { produce } from "immer";
import { DrObj, Folder, FolderSchema, Room, RoomSchema, Thread, ThreadSchema } from "../../..";
import { TEAM_MEMBERS_ROLE } from "@wodge/domain/constants";
import { WorkspaceStructure } from "../../../schemas/workspace.schema";

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

  if (!validateFields.success) throw new Error("Invalid folder data");

  const { data: newFolder } = validateFields;

  const newStructure = produce(structure, (draft) => {
    const team = draft.teams.find((t) => t.id === teamId);
    // Check if team not found
    if (!team) throw new Error("Team not found");
    // Check if folder not found

    const folderIdx = team.folders.findIndex((ch) => ch.id === newFolder.id);

    if (folderIdx === -1) {
      throw new Error("folder not found");
    } else {
      team.folders[folderIdx]! = newFolder; // Add page
    }
  });
  return newStructure as WorkspaceStructure;
}

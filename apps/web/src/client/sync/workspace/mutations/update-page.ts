import { workspaceError } from "./errors";
import { Page } from "@wodge/domain/pages/models";
import { PageSchema } from "@wodge/domain/pages/validation";
import { DrObj } from "@wodge/domain/types";
import { WorkspaceStructure } from "@wodge/domain/workspace/models";
import { produce } from "immer";

interface CreateTeamArgs {
  page: Page;
  teamId: string;
  folderId: string;
  structure: WorkspaceStructure | DrObj<WorkspaceStructure>;
}

export function updatePageMutation({
  page,
  folderId,
  teamId,
  structure,
}: CreateTeamArgs) {
  // Validate the data
  const validateFields = PageSchema.safeParse(page);

  if (!validateFields.success) {
    throw workspaceError("WORKSPACE_INVALID_INPUT", "Invalid page data");
  }

  const { data: newPage } = validateFields;

  const newStructure = produce(structure, (draft) => {
    const team = draft.teams.find((t) => t.id === teamId);
    // Check if team not found

    if (!team) {
      throw workspaceError("WORKSPACE_NOT_FOUND", "Team not found");
    }
    // Check if folder not found

    const fold = team?.folders.find((f) => f.id === folderId);

    if (!fold) {
      throw workspaceError("WORKSPACE_NOT_FOUND", "Folder not found");
    }
    // Check if channel already exists

    const pageIdx = fold.channels.findIndex((ch) => ch.id === newPage.id);

    if (pageIdx === -1) {
      throw workspaceError("WORKSPACE_NOT_FOUND", "Page not found");
    } else {
      fold.channels[pageIdx]! = newPage; // Add page
    }
  });

  return newStructure as WorkspaceStructure;
}

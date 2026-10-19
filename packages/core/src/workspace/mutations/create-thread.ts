import { workspaceError } from "@wodge/core/workspace/errors";
import { Thread } from "@wodge/domain/discussions/models";
import { ThreadSchema } from "@wodge/domain/discussions/validation";
import { DrObj } from "@wodge/domain/types";
import { WorkspaceStructure } from "@wodge/domain/workspace/models";
import { produce } from "immer";

interface CreateThreadArgs {
  thread: Thread;
  teamId: string;
  structure: WorkspaceStructure | DrObj<WorkspaceStructure>;
  curUserId: string;
}

export function createThreadMutation({
  thread,
  teamId,
  structure,
}: CreateThreadArgs) {
  // Validate the data
  const validateFields = ThreadSchema.safeParse(thread);

  if (!validateFields.success) {
    throw workspaceError("WORKSPACE_INVALID_INPUT", "Invalid thread data");
  }

  const { data: newThread } = validateFields;

  const newStructure = produce(structure, (draft) => {
    const team = draft.teams.find((t) => t.id === teamId);
    // Check if team not found

    if (!team) {
      throw workspaceError("WORKSPACE_NOT_FOUND", "Team not found");
    }

    // Check if thread already exists

    if (team.threads.find((ch) => ch.id === newThread.id)) {
      throw workspaceError("WORKSPACE_CONFLICT", "Thread already exists");
    } else {
      // check that every group id on the new page exists the workspace structure

      team.threads.push(newThread); // Add thread
    }
  });

  return newStructure as WorkspaceStructure;
}

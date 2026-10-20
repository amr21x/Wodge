import { workspaceError } from "./errors";
import { Thread } from "@wodge/domain/discussions/models";
import { ThreadSchema } from "@wodge/domain/discussions/validation";
import { DrObj } from "@wodge/domain/types";
import { WorkspaceStructure } from "@wodge/domain/workspace/models";
import { produce } from "immer";

interface UpdateThreadsArgs {
  thread: Thread;
  teamId: string;
  structure: WorkspaceStructure | DrObj<WorkspaceStructure>;
  userId: string;
}

export function updateThreadMutation({
  thread,
  teamId,
  structure,
}: UpdateThreadsArgs) {
  // Validate the data
  const validateFields = ThreadSchema.safeParse(thread);

  if (!validateFields.success) {
    throw workspaceError("WORKSPACE_INVALID_INPUT", "Invalid page data");
  }

  const { data: newThread } = validateFields;

  const newStructure = produce(structure, (draft) => {
    const team = draft.teams.find((t) => t.id === teamId);
    // Check if team not found

    if (!team) {
      throw workspaceError("WORKSPACE_NOT_FOUND", "Team not found");
    }
    // Check if folder not found

    const threadIdx = team.threads.findIndex((ch) => ch.id === newThread.id);

    if (threadIdx === -1) {
      throw workspaceError("WORKSPACE_NOT_FOUND", "Page not found");
    } else {
      team.threads[threadIdx]! = newThread; // Add page
    }
  });

  return newStructure as WorkspaceStructure;
}

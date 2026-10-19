import { workspaceError } from "@wodge/core/workspace/errors";
import { DrObj } from "@wodge/domain/types";
import { WorkspaceStructure } from "@wodge/domain/workspace/models";
import { produce } from "immer";

export function deleteThreadMutation({
  threadId,
  teamId,
  structure,
}: {
  threadId: string;
  teamId: string;
  structure: WorkspaceStructure | DrObj<WorkspaceStructure>;
}) {
  //check if thread team exists
  const team = structure.teams.find((t) => t.id === teamId);

  if (!team) {
    throw workspaceError("WORKSPACE_NOT_FOUND", "Team not found");
  }
  // Check if thread exists

  const thread = team.threads.find((t) => t.id === threadId);

  if (!thread) {
    throw workspaceError("WORKSPACE_NOT_FOUND", "Thread not found");
  }
  // Remove thread from the threads array

  const newStructure = produce(structure, (draft) => {
    draft.teams = draft.teams.map((t) => {
      if (t.id === teamId) {
        t.threads = t.threads.filter((th) => th.id !== threadId);
      }

      return t;
    });
  });

  return newStructure as WorkspaceStructure;
}

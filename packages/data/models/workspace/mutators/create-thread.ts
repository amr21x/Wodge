import { produce } from "immer";
import { DrObj, Thread, ThreadSchema } from "../../..";
import { TEAM_MEMBERS_ROLE } from "@wodge/domain/constants";
import { WorkspaceStructure } from "../../../schemas/workspace.schema";

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
  curUserId,
}: CreateThreadArgs) {
  // Validate the data
  const validateFields = ThreadSchema.safeParse(thread);

  if (!validateFields.success) throw new Error("Invalid thread data");

  const { data: newThread } = validateFields;

  const newStructure = produce(structure, (draft) => {
    const team = draft.teams.find((t) => t.id === teamId);
    // Check if team not found
    if (!team) throw new Error("Team not found");

    // Check if thread already exists
    if (team.threads.find((ch) => ch.id === newThread.id)) {
      throw new Error("Thread already exists");
    } else {
      // check that every group id on the new page exists the workspace structure

      team.threads.push(newThread); // Add thread
    }
  });
  return newStructure as WorkspaceStructure;
}

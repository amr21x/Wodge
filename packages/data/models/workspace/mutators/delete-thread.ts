import { produce } from "immer";
import { DrObj, Thread, ThreadSchema } from "../../..";
import { TEAM_MEMBERS_ROLE } from "@wodge/domain/constants";
import { WorkspaceStructure } from "../../../schemas/workspace.schema";

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
    if (!team) throw new Error("Team not found");
    // Check if thread exists
    const thread = team.threads.find((t) => t.id === threadId);
    if (!thread) throw new Error("Thread not found");
    // Remove thread from the threads array 
    const newStructure = produce(structure, (draft) => {
        draft.teams = draft.teams.map((t) => {
            if (t.id === teamId) {
                t.threads = t.threads.filter((th) => th.id !== threadId);
            }
            return t;
        });
    })

    return newStructure as WorkspaceStructure;
    
}
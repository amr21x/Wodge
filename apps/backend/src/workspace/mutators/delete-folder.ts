import { produce } from "immer";
import { RunnerParams } from "../../lib/replicache";
import { PushAuth } from "../handlers/workspace-push";
import WorkspaceParty from "../workspace-party";
import { makeWorkspaceStructureKey } from "@wodge/data";
import { deleteFolderMutation } from "@wodge/data/models/workspace/mutators/delete-folder";

export async function deleteFolder(
  party: WorkspaceParty,
  params: RunnerParams,
  auth: PushAuth
) {
  if (!auth.isOwnerOrAdmin && !auth.isTeamModerator) return;

  const args = params.mutation.args as { teamId: string; folderId: string };

  const newStructure = deleteFolderMutation({
    structure: party.workspaceStructure.data,
    folderId: args.folderId,
    teamId: args.teamId,
  });

  party.workspaceStructure = produce(party.workspaceStructure, (draft) => {
    draft.data = newStructure;
    draft.lastModifiedVersion = params.nextVersion;
  });

  await party.room.storage.put(
    makeWorkspaceStructureKey(),
    party.workspaceStructure
  );
}

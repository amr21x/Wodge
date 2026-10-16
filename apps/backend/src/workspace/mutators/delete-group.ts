import { deleteGroupMutation } from "@wodge/data/models/workspace/mutators/delete-group";
import { RunnerParams } from "../../lib/replicache";
import WorkspaceParty from "../workspace-party";
import { makeWorkspaceStructureKey } from "@wodge/data";
import { PushAuth } from "../handlers/workspace-push";
import { produce } from "immer";

export async function deleteGroup(
  party: WorkspaceParty,
  params: RunnerParams,
  auth: PushAuth
) {
  if (!auth.isOwnerOrAdmin) return;
  const newStructure = deleteGroupMutation({
    structure: party.workspaceStructure.data,
    groupId: params.mutation.args as string,
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

import { createGroupMutation } from "@wodge/data/models/workspace/mutators/create-group";
import { RunnerParams } from "../../lib/replicache";
import WorkspaceParty from "../workspace-party";
import { Group, makeWorkspaceStructureKey } from "@wodge/data";
import { PushAuth } from "../handlers/workspace-push";
import { produce } from "immer";

export async function createGroup(
  party: WorkspaceParty,
  params: RunnerParams,
  auth: PushAuth
) {
  if (!auth.isOwnerOrAdmin) return;
  const newStructure = createGroupMutation({
    currentUserId: params.userId,
    structure: party.workspaceStructure.data,
    group: params.mutation.args as Group,
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

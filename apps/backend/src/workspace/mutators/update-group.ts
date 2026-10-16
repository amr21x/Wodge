import { groupUpdateRunner } from "@wodge/data/models/workspace/mutators/group-update-runner";
import { RunnerParams } from "../../lib/replicache";
import WorkspaceParty from "../workspace-party";
import { WorkspaceStructure, makeWorkspaceStructureKey } from "@wodge/data";
import { GroupUpdateArgs } from "@wodge/data/models/workspace/workspace-mutators";
import { PushAuth } from "../handlers/workspace-push";
import { produce } from "immer";

export async function updateGroup(
  party: WorkspaceParty,
  params: RunnerParams,
  auth: PushAuth
) {
  if (!auth.isOwnerOrAdmin) return;

  const { groupId, groupUpdate } = params.mutation.args as GroupUpdateArgs;

  const curMembers = party.workspaceMembers.data.members.map((m) => m.id);

  const newStructure = groupUpdateRunner({
    structure: party.workspaceStructure.data,
    groupUpdate,
    groupId,
    curMembers,
  }) as WorkspaceStructure;

  party.workspaceStructure = produce(party.workspaceStructure, (draft) => {
    draft.data = newStructure;
    draft.lastModifiedVersion = params.nextVersion;
  });

  await party.room.storage.put(
    makeWorkspaceStructureKey(),
    party.workspaceStructure
  );
}

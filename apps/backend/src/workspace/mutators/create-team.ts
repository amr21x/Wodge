import WorkspaceParty from "../workspace-party";
import { createTeamMutation } from "@wodge/data/models/workspace/mutators/create-team";
import { RunnerParams } from "../../lib/replicache";
import { Team, makeWorkspaceStructureKey } from "@wodge/data";
import { PushAuth } from "../handlers/workspace-push";
import { produce } from "immer";

export async function createTeam(
  party: WorkspaceParty,
  params: RunnerParams,
  auth: PushAuth
) {
  if (!auth.isOwnerOrAdmin) return;
  const newStructure = createTeamMutation({
    currentUserId: params.userId,
    structure: party.workspaceStructure.data,
    team: params.mutation.args as Team,
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

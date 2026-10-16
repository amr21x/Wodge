import {
  TeamUpdate,
  teamUpdateRunner,
} from "@wodge/data/models/workspace/mutators/team-update-runner";
import { RunnerParams } from "../../lib/replicache";
import WorkspaceParty from "../workspace-party";
import { WorkspaceStructure, makeWorkspaceStructureKey } from "@wodge/data";
import { TeamUpdateArgs } from "@wodge/data/models/workspace/workspace-mutators";
import { PushAuth } from "../handlers/workspace-push";
import { produce } from "immer";

export async function updateTeam(
  party: WorkspaceParty,
  params: RunnerParams,
  auth: PushAuth
) {
  if (!auth.isOwnerOrAdmin && !auth.isTeamModerator) return;

  const { teamId, teamUpdate } = params.mutation.args as TeamUpdateArgs;

  const curMembers = party.workspaceMembers.data.members.map((m) => m.id);

  const newStructure = teamUpdateRunner({
    structure: party.workspaceStructure.data,
    teamUpdate,
    teamId,
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

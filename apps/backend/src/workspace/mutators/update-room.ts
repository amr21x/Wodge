import WorkspaceParty from "../workspace-party";
import { RunnerParams } from "../../lib/replicache";
import { makeWorkspaceStructureKey } from "@wodge/data";
import { NewRoomArgs } from "@wodge/data/models/workspace/workspace-mutators";
import { updateRoomMutation } from "@wodge/data/models/workspace/mutators/update-room";
import { PushAuth } from "../handlers/workspace-push";
import { produce } from "immer";

export async function updateRoom(
  party: WorkspaceParty,
  params: RunnerParams,
  auth: PushAuth
) {
  if (!auth.isOwnerOrAdmin && !auth.isTeamModerator) return;

  const { teamId, ...room } = params.mutation.args as NewRoomArgs;

  if (!teamId || !room) return;

  const newStructure = updateRoomMutation({
    structure: party.workspaceStructure.data,
    teamId,
    room,
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

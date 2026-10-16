import WorkspaceParty from "../workspace-party";
import { RunnerParams } from "../../lib/replicache";
import { makeWorkspaceStructureKey } from "@wodge/data";
import {
  NewFolderArgs,
  NewRoomArgs,
  NewThreadArgs,
} from "@wodge/data/models/workspace/workspace-mutators";
import { updateRoomMutation } from "@wodge/data/models/workspace/mutators/update-room";
import { updateThreadMutation } from "@wodge/data/models/workspace/mutators/update-thread";
import { updateFolderMutation } from "@wodge/data/models/workspace/mutators/update-folder";
import { PushAuth } from "../handlers/workspace-push";
import { produce } from "immer";

export async function updateFolder(
  party: WorkspaceParty,
  params: RunnerParams,
  auth: PushAuth
) {
  if (!auth.isOwnerOrAdmin && !auth.isTeamModerator) return;

  const { teamId, ...folder } = params.mutation.args as NewFolderArgs;

  if (!teamId || !folder) return;

  const newStructure = updateFolderMutation({
    structure: party.workspaceStructure.data,
    teamId,
    folder,
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

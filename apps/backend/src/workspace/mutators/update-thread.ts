import WorkspaceParty from "../workspace-party";
import { RunnerParams } from "../../lib/replicache";
import { makeWorkspaceStructureKey } from "@wodge/data";
import {
  NewRoomArgs,
  NewThreadArgs,
} from "@wodge/data/models/workspace/workspace-mutators";
import { updateRoomMutation } from "@wodge/data/models/workspace/mutators/update-room";
import { updateThreadMutation } from "@wodge/data/models/workspace/mutators/update-thread";
import { PushAuth } from "../handlers/workspace-push";
import { produce } from "immer";

export async function updateThread(
  party: WorkspaceParty,
  params: RunnerParams,
  auth: PushAuth
) {
  const { teamId, ...thread } = params.mutation.args as NewThreadArgs;

  if (!teamId || !thread) return;

  const newStructure = updateThreadMutation({
    structure: party.workspaceStructure.data,
    teamId,
    thread,
    userId: params.userId,
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

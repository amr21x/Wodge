import { NewThreadArgs } from "@wodge/data/models/workspace/workspace-mutators";
import { RunnerParams } from "../../lib/replicache";
import WorkspaceParty from "../workspace-party";
import { makeWorkspaceStructureKey } from "@wodge/data";
import { createThreadMutation } from "@wodge/data/models/workspace/mutators/create-thread";
import { PushAuth } from "../handlers/workspace-push";
import { produce } from "immer";

export async function createThread(
  party: WorkspaceParty,
  params: RunnerParams,
  auth: PushAuth
) {
  if (!auth.isOwnerOrAdmin && !auth.isTeamModerator) return;

  const { teamId, ...thread } = params.mutation.args as NewThreadArgs;

  const newStructure = createThreadMutation({
    curUserId: params.userId,
    structure: party.workspaceStructure.data,
    teamId,
    thread,
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

import WorkspaceParty from "../workspace-party";
import { RunnerParams } from "../../lib/replicache";
import { Channel } from "@wodge/domain/channels";
import { makeWorkspaceStructureKey } from "@wodge/data";
import { createPageMutation } from "@wodge/data/models/workspace/mutators/create-page";
import { NewPageArgs } from "@wodge/data/models/workspace/workspace-mutators";
import { updatePageMutation } from "@wodge/data/models/workspace/mutators/update-page";
import { PushAuth } from "../handlers/workspace-push";
import { produce } from "immer";

export async function updatePage(
  party: WorkspaceParty,
  params: RunnerParams,
  auth: PushAuth
) {
  if (!auth.isOwnerOrAdmin && !auth.isTeamModerator) return;
  const { folderId, teamId, ...page } = params.mutation.args as NewPageArgs;

  if (!folderId || !teamId || !page) return;

  const newStructure = updatePageMutation({
    structure: party.workspaceStructure.data,
    folderId,
    teamId,
    page,
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

import { deleteChannelMutation } from "@wodge/data/models/workspace/mutators/delete-channel";
import { RunnerParams } from "../../lib/replicache";
import WorkspaceParty from "../workspace-party";
import { makeWorkspaceStructureKey } from "@wodge/data";
import { DeleteChannelArgs } from "@wodge/data/models/workspace/workspace-mutators";
import { PushAuth } from "../handlers/workspace-push";
import { produce } from "immer";

export async function deleteChannel(
  party: WorkspaceParty,
  params: RunnerParams,
  auth: PushAuth
) {
  const args = params.mutation.args as DeleteChannelArgs;

  // Delete a page or room is only administrative
  if (args.type === "page" || args.type === "room")
    if (!auth.isOwnerOrAdmin && !auth.isTeamModerator) return;

  const newStructure = deleteChannelMutation({
    structure: party.workspaceStructure.data,
    channelId: args.channelId,
    folderId: args?.folderId,
    teamId: args.teamId,
    type: args.type,
    userId: params.userId,
    isAdmin: auth.isOwnerOrAdmin || auth.isTeamModerator,
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

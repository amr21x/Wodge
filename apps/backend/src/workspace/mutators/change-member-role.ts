import { changeMemberRoleMutation } from "@wodge/data/models/workspace/mutators/change-member-role";
import { RunnerParams } from "../../lib/replicache";
import WorkspaceParty from "../workspace-party";
import { WorkspaceMembers, makeWorkspaceMembersKey } from "@wodge/data";
import { produce } from "immer";
import { PushAuth } from "../handlers/workspace-push";

export async function changeMemberRole(
  party: WorkspaceParty,
  params: RunnerParams,
  auth: PushAuth
) {
  if (!auth.isOwnerOrAdmin) return;

  party.workspaceMembers = produce(party.workspaceMembers, (draft) => {
    draft.data = changeMemberRoleMutation({
      members: draft.data,
      memberId: params.mutation.args.memberId,
      role: params.mutation.args.role,
    }) as WorkspaceMembers;

    draft.lastModifiedVersion = params.nextVersion;
  });

  await party.room.storage.put(
    makeWorkspaceMembersKey(),
    party.workspaceMembers
  );
}

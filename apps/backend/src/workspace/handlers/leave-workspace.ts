import { removeMemberMutation } from "@wodge/data/models/workspace/mutators/remove-member";
import WorkspaceParty from "../workspace-party";
import {
  WorkspaceMembers,
  makeWorkspaceMembersKey,
  makeWorkspaceStructureKey,
} from "@wodge/data";
import { produce } from "immer";

import { badRequest, ok } from "../../lib/http-utils";
import { Context } from "hono";

export async function leaveWorkspace(party: WorkspaceParty, c: Context) {
  const memberId = c.req.header("x-user-id") as string;

  const newState = removeMemberMutation({
    memberId,
    members: party.workspaceMembers.data,
  }) as WorkspaceMembers;

  const globalVersion = party.versions.get("globalVersion") as number;

  party.workspaceMembers = produce(party.workspaceMembers, (draft) => {
    draft.data = newState;
    draft.lastModifiedVersion = globalVersion + 1;
  });

  // remove the member from every group and every team
  party.workspaceStructure = produce(party.workspaceStructure, (draft) => {
    draft.data.teams.forEach((t) => {
      if (t.members.includes(memberId))
        t.members = t.members.filter((tt) => tt !== memberId);
    });

    draft.data.groups.forEach((g) => {
      if (g.members.includes(memberId))
        g.members = g.members.filter((gg) => gg !== memberId);
    });

    draft.lastModifiedVersion = globalVersion + 1;
  });

  party.versions.set("globalVersion", globalVersion + 1);

  await party.room.storage.put({
    [makeWorkspaceMembersKey()]: party.workspaceMembers,
    REPLICACHE_VERSIONS_KEY: party.versions,
    [makeWorkspaceStructureKey()]: party.workspaceStructure,
  });

  // Update the user party
  const userParty = party.room.context.parties.user!;

  const userInstance = userParty.get(memberId);

  const res = await userInstance.fetch("/service/remove-workspace", {
    method: "POST",
    headers: {
      authorization: party.room.env.SECRET_KEY as string,
    },
    body: JSON.stringify({ workspaceId: party.room.id }),
  });

  if (!res.ok) return badRequest();

  await party.poke({
    type: "workspaceMembers",
    id: party.room.id,
  });

  return ok();
}

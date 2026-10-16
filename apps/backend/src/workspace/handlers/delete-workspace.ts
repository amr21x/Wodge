import WorkspaceParty from "../workspace-party";
import {
  defaultWorkspaceMembers,
  defaultWorkspaceStructure,
  makeWorkspaceMembersKey,
  makeWorkspaceStructureKey,
} from "@wodge/data";

import { badRequest, ok } from "../../lib/http-utils";

export async function deleteWorkspace(party: WorkspaceParty) {
  // Update the user party
  const userParty = party.room.context.parties.user!;

  const deletes = party.workspaceMembers.data.members.map((m) =>
    userParty.get(m.id).fetch("/service/remove-workspace", {
      method: "POST",
      headers: {
        authorization: party.room.env.SECRET_KEY as string,
      },
      body: JSON.stringify({ workspaceId: party.room.id }),
    })
  );

  // remove from db too

  const responses = await Promise.all(deletes);

  if (responses.some((r) => !r.ok)) return badRequest();

  await party.poke({
    type: "deleteWorkspace",
    id: party.room.id,
  });

  party.workspaceMembers = {
    data: { ...defaultWorkspaceMembers() },
    lastModifiedVersion: 0,
    deleted: false,
  };

  party.workspaceStructure = {
    data: { ...defaultWorkspaceStructure() },
    lastModifiedVersion: 0,
    deleted: false,
  };

  party.versions = new Map([
    ["globalVersion", 0],
    ["workspaceInfo", 0],
  ]);
  // party.invites = new Map();
  party.presenceMap = new Map();

  await party.room.storage.put({
    [makeWorkspaceMembersKey()]: party.workspaceMembers,
    [makeWorkspaceStructureKey()]: party.workspaceStructure,
    REPLICACHE_VERSIONS_KEY: party.versions,
    // WORKSPACE_INVITES_KEY: party.invites,
    WORKSPACE_PRESENCE_KEY: party.presenceMap,
  });

  return ok();
}

import { badRequest, json, ok, unauthorized } from "../../lib/http-utils";
import WorkspaceParty from "../workspace-party";
import {
  Invite,
  Member,
  REPLICACHE_VERSIONS_KEY,
  WORKSPACE_INVITES_KEY,
  WORKSPACE_PRESENCE_KEY,
  WORKSPACE_STRUCTURE_KEY,
  addWorkspaceMember,
  makeWorkspaceMembersKey,
  makeWorkspaceStructureKey,
} from "@wodge/data";
import { isMemberInWorkspace } from "../../lib/utils";
import { produce } from "immer";
import { Context } from "hono";

export async function joinWorkspace(party: WorkspaceParty, c: Context) {
  // const token = c.req.param("token");
  const userId = c.req.header("x-user-id");

  if (!userId) return unauthorized();

  // // 1. check if the user is already a member
  const isMember = isMemberInWorkspace(userId, party);

  if (isMember) return badRequest();

  const { invite } = await c.req.json<{ invite: Invite }>();

  if (!invite) return badRequest();
  // if (!invite) return badRequest();
  // 3. Add workspace to user data
  const userParty = party.room.context.parties.user!;

  const userInstance = userParty.get(userId);

  await userInstance.fetch("/service/add-workspace", {
    method: "POST",
    headers: {
      authorization: party.room.env.SECRET_KEY as string,
      workspaceId: party.room.id,
    },
  });

  // 4. add the user to the workspace
  const newMember: Member = addWorkspaceMember(userId, "member", invite);

  // 5. Update Replicache versions
  const nextVersion = (party.versions.get("globalVersion") as number) + 1;

  party.workspaceMembers = produce(party.workspaceMembers, (draft) => {
    draft.data.members.push(newMember);
    draft.lastModifiedVersion = nextVersion;
  });

  party.versions.set("globalVersion", nextVersion);

  // 6. Update presence
  party.presenceMap.set(userId, true);

  party.workspaceStructure = produce(party.workspaceStructure, (draft) => {
    const def = draft.data.teams.find((t) => t.default);

    if (def) {
      def.members.push(userId);
      draft.lastModifiedVersion = nextVersion;
    }
  });

  // 7. persist updates
  await party.room.storage.put({
    [makeWorkspaceMembersKey()]: party.workspaceMembers,
    // [WORKSPACE_INVITES_KEY]: party.invites,
    [REPLICACHE_VERSIONS_KEY]: party.versions,
    [WORKSPACE_PRESENCE_KEY]: party.presenceMap,
    [makeWorkspaceStructureKey()]: party.workspaceStructure,
  });

  // Inform current members of the new user
  await party.poke();

  return ok();
}

import WorkspaceParty from "../workspace-party";
import { badRequest, error, ok, unauthorized } from "../../lib/http-utils";
import {
  createDefaultTeam,
  defaultWorkspaceStructure,
  getBucketAddress,
  makeWorkspaceMembersKey,
  makeWorkspaceStructureKey,
  NewWorkspaceSchema,
  REPLICACHE_VERSIONS_KEY,
  Workspace,
  WORKSPACE_PRESENCE_KEY,
} from "@wodge/data";
import { produce } from "immer";
import { Context } from "hono";
import { CreateBucketCommand } from "@aws-sdk/client-s3";
import { getS3Client } from "../../lib/get-s3-client";

export async function createWorkspace(party: WorkspaceParty, c: Context) {
  // 2. add owner to the workspace members as owner and member
  const userId = c.req.header("x-user-id");

  if (!userId) {
    return badRequest();
  }

  // 5. Add workspace to user data
  const userParty = party.room.context.parties.user!;

  const userInstance = userParty.get(userId);

  // Should not fail
  const res = await userInstance.fetch("/service/add-workspace", {
    method: "POST",
    headers: {
      authorization: party.room.env.SECRET_KEY as string,
      workspaceId: party.room.id,
    },
  });

  if (!res.ok) return badRequest();

  // 6. add the workspace in the do
  const globalVersion = (party.versions.get("globalVersion") as number) || 0;

  party.workspaceMembers = produce(party.workspaceMembers, (draft) => {
    draft.data.createdBy = userId;
    draft.data.members.push({
      id: userId,
      role: "owner",
      joinInfo: {
        joinedAt: new Date().toISOString(),
        token: "",
        createdBy: "",
      },
    });
    draft.lastModifiedVersion = globalVersion + 1;
  });

  party.workspaceStructure = produce(party.workspaceStructure, (draft) => {
    draft.data = defaultWorkspaceStructure();
    draft.data.teams.push(createDefaultTeam(userId));
    draft.lastModifiedVersion = globalVersion + 1;
  });

  // 7. update global versions
  party.versions.set("globalVersion", globalVersion + 1);
  party.versions.set("workspaceInfo", globalVersion + 1);

  // 8. add user to presence map
  party.presenceMap.set(userId, true);

  // 9. persist updates
  await party.room.storage.put({
    [REPLICACHE_VERSIONS_KEY]: party.versions,
    [makeWorkspaceMembersKey()]: party.workspaceMembers,
    [makeWorkspaceStructureKey()]: party.workspaceStructure,
    [WORKSPACE_PRESENCE_KEY]: party.presenceMap,
  });

  // 10. create workspace bucket
  try {
    const s3Client = getS3Client(party.room);
    const input = {
      Bucket: getBucketAddress(party.room.id),
    };
    const command = new CreateBucketCommand(input);
    await s3Client.send(command);

    return ok();
  } catch (error) {
    console.log(error);
    return badRequest();
  }
}

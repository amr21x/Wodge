import WorkspaceParty from "../workspace-party";
import { RunnerParams, repPush } from "../../lib/replicache";
import { createTeam } from "../mutators/create-team";
import { updateTeam } from "../mutators/update-team";
import { removeMember } from "../mutators/remove-member";
import { changeMemberRole } from "../mutators/change-member-role";
import { createGroup } from "../mutators/create-group";
import { updateGroup } from "../mutators/update-group";
import { deleteGroup } from "../mutators/delete-group";
import { deleteTeam } from "../mutators/delete-team";
import { createPage } from "../mutators/create-page";
import { createRoom } from "../mutators/create-room";
import { createThread } from "../mutators/create-thread";
import { isAdmin, isOwner, isTeamModerator } from "@wodge/data";
import { deleteChannel } from "../mutators/delete-channel";
import { updatePage } from "../mutators/update-page";
import { updateRoom } from "../mutators/update-room";
import { updateThread } from "../mutators/update-thread";
import { updateFolder } from "../mutators/update-folder";
import { deleteFolder } from "../mutators/delete-folder";
import { Context, HonoRequest } from "hono";

export interface PushAuth {
  isOwnerOrAdmin: boolean;
  isTeamModerator: boolean;
}

const functions: Record<
  string,
  (
    party: WorkspaceParty,
    params: RunnerParams,
    auth: PushAuth
  ) => void | Promise<void>
> = {
  // Member Management
  removeMember,
  changeMemberRole,

  // Team Management
  createTeam,
  updateTeam,
  deleteTeam,

  // Group Management
  createGroup,
  updateGroup,
  deleteGroup,

  // Channels Management
  createPage,
  createRoom,
  createThread,

  updatePage,
  updateFolder,
  updateRoom,
  updateThread,

  deleteChannel,
  deleteFolder,
};

export async function workspacePush(party: WorkspaceParty, c: Context) {
  const res = await repPush({
    req: c.req,
    storage: party.room.storage,
    versions: party.versions,
    runner: runner(party, c.req),
  });

  if (res.status === 200) {
    await party.poke();
  }

  return res;
}

//verify room id
function runner(party: WorkspaceParty, req: HonoRequest) {
  return async (params: RunnerParams) => {
    const isOwnerOrAdmin =
      isAdmin({
        members: party.workspaceMembers.data,
        userId: req.header("x-user-id")!,
      }) ||
      isOwner({
        members: party.workspaceMembers.data,
        userId: req.header("x-user-id")!,
      });

    const isTeamModeratorFlag = isTeamModerator({
      structure: party.workspaceStructure.data,
      userId: req.header("x-user-id")!,
      teamId: params.mutation.args.teamId,
    });

    const fn = functions[params.mutation.name];

    if (!fn) {
      throw new Error("Unknown mutation: " + params.mutation.name);
    }

    try {
      return await fn(party, params, {
        isOwnerOrAdmin,
        isTeamModerator: isTeamModeratorFlag,
      });
    } catch (e) {
      return;
    }
  };
}

import WorkspaceParty from "../workspace-party";
import { json, unauthorized } from "../../lib/http-utils";
import {
  canEdit,
  canView,
  isAdmin,
  isTeamMember,
  isTeamModerator,
} from "@wodge/data";
import { ChannelsTypes } from "@wodge/domain/channels";
import { Context } from "hono";

export interface AuthChannelResponse {
  success: boolean;
  isMember?: boolean;
  isOwner?: boolean;
  isAdmin?: boolean;
  canEdit?: boolean;
  canView?: boolean;
  isTeamModerator?: boolean;
}

export function authChannel(party: WorkspaceParty, c: Context) {
  // from rep wrapper
  const workspaceId = c.req.header("x-workspace-id");
  const teamId = c.req.header("x-team-id") as string | undefined;
  const folderId = c.req.header("x-folder-id") as string | undefined;

  // from channel party
  const userId = c.req.header("x-user-id") as string;
  const channelId = c.req.header("x-channel-id") as string;
  const channelType = c.req.header("x-channel-type") as ChannelsTypes;

  if (workspaceId !== party.room.id) return unauthorized();

  if (party.workspaceMembers.data.createdBy === userId)
    return json({
      success: true,
      isOwner: true,
    } as AuthChannelResponse);

  if (
    !party.workspaceMembers.data.members.some((member) => member.id === userId)
  )
    return json({
      success: false,
    });

  if (isAdmin({ members: party.workspaceMembers.data, userId })) {
    return json({
      success: true,
      isAdmin: true,
      canEdit: true,
      canView: true,
    });
  }

  if (
    isTeamModerator({
      structure: party.workspaceStructure.data,
      teamId,
      userId,
    })
  ) {
    return json({
      success: true,
      isTeamModerator: true,
    });
  }

  if (
    !isTeamMember({ structure: party.workspaceStructure.data, userId, teamId })
  ) {
    return json({ success: false });
  }

  if (
    canEdit({
      members: party.workspaceMembers.data,
      userId,
      channelId,
      structure: party.workspaceStructure.data,
      channelType,
      folderId,
      teamId,
    })
  ) {
    return json({
      success: true,
      canEdit: true,
      canView: true,
    });
  }

  if (
    canView({
      members: party.workspaceMembers.data,
      userId,
      channelId,
      structure: party.workspaceStructure.data,
      channelType,
      folderId,
      teamId,
    })
  ) {
    return json({
      success: true,
      canEdit: false,
      canView: true,
    });
  }

  return json({
    success: false,
  });
}

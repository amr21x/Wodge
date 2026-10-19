import {
  canEdit,
  canView,
  isAdmin,
  isTeamMember,
  isTeamModerator,
} from "@wodge/auth/authorization/access";
import type {
  AuthChannelResponse,
  ChannelsTypes,
} from "@wodge/domain/channels/index";
import type { WorkspaceState } from "@wodge/domain/workspace/models";

export function authorizeWorkspaceChannel(
  state: WorkspaceState,
  {
    userId,
    teamId,
    folderId,
    channelId,
    channelType,
  }: {
    userId: string;
    teamId?: string;
    folderId?: string;
    channelId: string;
    channelType: ChannelsTypes;
  },
): AuthChannelResponse {
  if (state.members.createdBy === userId) {
    return {
      success: true,
      isOwner: true,
    };
  }

  if (!state.members.members.some((member) => member.id === userId)) {
    return {
      success: false,
    };
  }

  if (isAdmin({ members: state.members, userId })) {
    return {
      success: true,
      isAdmin: true,
      canEdit: true,
      canView: true,
    };
  }

  if (
    isTeamModerator({
      structure: state.structure,
      teamId,
      userId,
    })
  ) {
    return {
      success: true,
      isTeamModerator: true,
    };
  }

  if (!isTeamMember({ structure: state.structure, userId, teamId })) {
    return { success: false };
  }

  if (
    canEdit({
      members: state.members,
      userId,
      channelId,
      structure: state.structure,
      channelType,
      folderId,
      teamId,
    })
  ) {
    return {
      success: true,
      canEdit: true,
      canView: true,
    };
  }

  if (
    canView({
      members: state.members,
      userId,
      channelId,
      structure: state.structure,
      channelType,
      folderId,
      teamId,
    })
  ) {
    return {
      success: true,
      canEdit: false,
      canView: true,
    };
  }

  return {
    success: false,
  };
}

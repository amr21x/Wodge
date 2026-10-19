import {
  canEdit,
  canView,
  isAdmin,
  isOwner,
  isTeamMember,
  isTeamModerator,
} from "@wodge/auth/authorization/access";
import { authorizeWorkspaceChannel } from "@wodge/auth/authorization/channel-access";
import { WorkspaceLifecycleRepository } from "@wodge/core/workspace/repositories/lifecycle";
import type { ChannelsTypes } from "@wodge/domain/channels/index";
import type { WorkspaceState } from "@wodge/domain/workspace/models";
import { inject, injectable } from "tsyringe";

type ChannelAccess = {
  userId?: string;
  teamId: string;
  channelId: string;
  channelType: ChannelsTypes;
  folderId?: string;
};

function canManageWorkspace(state: WorkspaceState, userId?: string) {
  if (
    !isOwner({
      members: state.members,
      userId,
    }) &&
    !isAdmin({
      members: state.members,
      userId,
    })
  ) {
    return false;
  }

  return true;
}

function canJoinWorkspaceTeam(
  state: WorkspaceState,
  userId: string | undefined,
  teamId: string,
) {
  if (
    !isTeamMember({
      structure: state.structure,
      teamId,
      userId,
    })
  ) {
    return false;
  }

  return true;
}

function canModerateWorkspaceTeam(
  state: WorkspaceState,
  userId: string | undefined,
  teamId: string,
) {
  if (
    !isTeamModerator({
      structure: state.structure,
      teamId,
      userId,
    }) &&
    !isAdmin({
      members: state.members,
      userId,
    }) &&
    !isOwner({
      members: state.members,
      userId,
    })
  ) {
    return false;
  }

  return true;
}

function canEditWorkspaceChannel(
  state: WorkspaceState,
  { userId, teamId, channelId, channelType, folderId }: ChannelAccess,
) {
  if (
    !canEdit({
      structure: state.structure,
      teamId,
      userId,
      channelId,
      channelType,
      members: state.members,
      folderId,
    }) &&
    !isAdmin({
      members: state.members,
      userId,
    }) &&
    !isOwner({
      members: state.members,
      userId,
    })
  ) {
    return false;
  }

  return true;
}

function canViewWorkspaceChannel(
  state: WorkspaceState,
  { userId, teamId, channelId, channelType, folderId }: ChannelAccess,
) {
  if (
    !canEdit({
      structure: state.structure,
      teamId,
      userId,
      channelId,
      channelType,
      members: state.members,
      folderId,
    }) &&
    !canView({
      structure: state.structure,
      teamId,
      userId,
      channelId,
      channelType,
      members: state.members,
      folderId,
    }) &&
    !isAdmin({
      members: state.members,
      userId,
    }) &&
    !isOwner({
      members: state.members,
      userId,
    })
  ) {
    return false;
  }

  return true;
}

function hasWorkspaceMembership(state: WorkspaceState, userId?: string) {
  return (
    state.members.createdBy === userId ||
    state.members.members.some((member) => member.id === userId)
  );
}

@injectable()
export class WorkspaceAccess {
  constructor(
    @inject(WorkspaceLifecycleRepository)
    private readonly workspace: WorkspaceState,
  ) {}

  hasMember(userId?: string) {
    return hasWorkspaceMembership(this.workspace, userId);
  }

  canManage(userId?: string) {
    return canManageWorkspace(this.workspace, userId);
  }

  canJoinTeam(userId: string | undefined, teamId: string) {
    return canJoinWorkspaceTeam(this.workspace, userId, teamId);
  }

  canModerateTeam(userId: string | undefined, teamId: string) {
    return canModerateWorkspaceTeam(this.workspace, userId, teamId);
  }

  canEdit(input: Parameters<typeof canEditWorkspaceChannel>[1]) {
    return canEditWorkspaceChannel(this.workspace, input);
  }

  canView(input: Parameters<typeof canViewWorkspaceChannel>[1]) {
    return canViewWorkspaceChannel(this.workspace, input);
  }

  authorize(input: Parameters<typeof authorizeWorkspaceChannel>[1]) {
    return authorizeWorkspaceChannel(this.workspace, input);
  }
}

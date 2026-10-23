import { WorkspaceAuthorization } from "@wodge/auth/authorization/service";
import {
  isAdmin,
  isOwner,
  isTeamMember,
  isTeamModerator,
} from "@wodge/auth/authorization/access";
import { authorizeWorkspaceChannel } from "@wodge/auth/authorization/channel-access";
import { WorkspaceLifecycleRepository } from "@wodge/core/workspace/repositories/lifecycle";
import type {
  AuthChannelResponse,
  ChannelsTypes,
} from "@wodge/domain/channels/index";
import type { WorkspaceState } from "@wodge/domain/workspace/models";
import { inject, injectable } from "tsyringe";

type ChannelAccess = {
  userId?: string;
  teamId?: string;
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
    @inject(WorkspaceAuthorization)
    private readonly authorization: WorkspaceAuthorization,
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

  async canEdit(input: ChannelAccess) {
    return (
      (await this.authorize({ ...input, userId: input.userId ?? "" }))
        .canEdit === true
    );
  }
  async canView(input: ChannelAccess) {
    return (
      (await this.authorize({ ...input, userId: input.userId ?? "" }))
        .canView === true
    );
  }
  async authorize(
    input: ChannelAccess & { userId: string },
  ): Promise<AuthChannelResponse> {
    if (input.channelType === "resources") return { success: false };
    const team = this.workspace.structure.teams.find(
      (t) => t.id === input.teamId,
    );
    const exists =
      input.channelType === "room"
        ? team?.rooms.some((r) => r.id === input.channelId)
        : input.channelType === "thread"
          ? team?.threads.some((r) => r.id === input.channelId)
          : team?.folders.some(
              (f) =>
                (!input.folderId || f.id === input.folderId) &&
                f.channels.some((p) => p.id === input.channelId),
            );
    if (!exists) return { success: false };
    const result = authorizeWorkspaceChannel(
      await this.authorization.permissionsForUser(input.userId, {
        type: input.channelType,
        id: input.channelId,
      }),
      input.channelType,
    );
    return {
      ...result,
      isOwner:
        result.success &&
        isOwner({ members: this.workspace.members, userId: input.userId }),
      isAdmin:
        result.success &&
        isAdmin({ members: this.workspace.members, userId: input.userId }),
      isTeamModerator:
        result.success &&
        result.canEdit === true &&
        team?.moderators.includes(input.userId),
    };
  }
}

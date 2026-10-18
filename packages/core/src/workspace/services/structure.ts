import { workspaceError } from "@wodge/core/workspace/errors";
import { createGroupMutation } from "@wodge/core/workspace/mutations/create-group";
import { createPageMutation } from "@wodge/core/workspace/mutations/create-page";
import { createRoomMutation } from "@wodge/core/workspace/mutations/create-room";
import { createTeamMutation } from "@wodge/core/workspace/mutations/create-team";
import { createThreadMutation } from "@wodge/core/workspace/mutations/create-thread";
import { deleteChannelMutation } from "@wodge/core/workspace/mutations/delete-channel";
import { deleteFolderMutation } from "@wodge/core/workspace/mutations/delete-folder";
import { deleteGroupMutation } from "@wodge/core/workspace/mutations/delete-group";
import { deleteTeamMutation } from "@wodge/core/workspace/mutations/delete-team";
import { groupUpdateRunner } from "@wodge/core/workspace/mutations/group-update-runner";
import { teamUpdateRunner } from "@wodge/core/workspace/mutations/team-update-runner";
import { updateFolderMutation } from "@wodge/core/workspace/mutations/update-folder";
import { updatePageMutation } from "@wodge/core/workspace/mutations/update-page";
import { updateRoomMutation } from "@wodge/core/workspace/mutations/update-room";
import { updateThreadMutation } from "@wodge/core/workspace/mutations/update-thread";
import { WorkspaceStateRepository } from "@wodge/core/workspace/repositories/state";
import type { ResourceActor } from "@wodge/domain/channels/index";
import type { WorkspaceInputs } from "@wodge/domain/workspace/dto";
import type { WorkspaceStructure } from "@wodge/domain/workspace/models";
import { inject, injectable } from "tsyringe";

@injectable()
export class WorkspaceService {
  constructor(
    @inject(WorkspaceStateRepository)
    private readonly workspace: Pick<
      WorkspaceStateRepository,
      keyof WorkspaceStateRepository
    >,
  ) {}

  async createPage(
    input: WorkspaceInputs["createPage"],
    actor: ResourceActor,
    revision?: number,
  ) {
    const { folderId, teamId, ...page } = input;

    if (!folderId || !teamId || !page) {
      throw workspaceError(
        "WORKSPACE_INVALID_INPUT",
        "Workspace operation input is incomplete",
      );
    }

    const newStructure = createPageMutation({
      structure: this.workspace.structure,
      folderId,
      teamId,
      page,
    });

    this.workspace.structure = newStructure;

    await this.workspace.saveStructure(revision);
  }

  async deleteGroup(
    input: WorkspaceInputs["deleteGroup"],
    actor: ResourceActor,
    revision?: number,
  ) {
    const newStructure = deleteGroupMutation({
      structure: this.workspace.structure,
      groupId: input,
    });

    this.workspace.structure = newStructure;

    await this.workspace.saveStructure(revision);
  }

  async deleteTeam(
    input: WorkspaceInputs["deleteTeam"],
    actor: ResourceActor,
    revision?: number,
  ) {
    const newStructure = deleteTeamMutation({
      structure: this.workspace.structure,
      teamId: input,
    });

    this.workspace.structure = newStructure;

    await this.workspace.saveStructure(revision);
  }

  async deleteFolder(
    input: WorkspaceInputs["deleteFolder"],
    actor: ResourceActor,
    revision?: number,
  ) {
    const newStructure = deleteFolderMutation({
      structure: this.workspace.structure,
      folderId: input.folderId,
      teamId: input.teamId,
    });

    this.workspace.structure = newStructure;

    await this.workspace.saveStructure(revision);
  }

  async updateRoom(
    input: WorkspaceInputs["updateRoom"],
    actor: ResourceActor,
    revision?: number,
  ) {
    const { teamId, ...room } = input;

    if (!teamId || !room) {
      throw workspaceError(
        "WORKSPACE_INVALID_INPUT",
        "Workspace operation input is incomplete",
      );
    }

    const newStructure = updateRoomMutation({
      structure: this.workspace.structure,
      teamId,
      room,
    });

    this.workspace.structure = newStructure;

    await this.workspace.saveStructure(revision);
  }

  async deleteChannel(
    input: WorkspaceInputs["deleteChannel"],
    actor: ResourceActor,
    revision?: number,
  ) {
    const args = input;

    const newStructure = deleteChannelMutation({
      structure: this.workspace.structure,
      channelId: args.channelId,
      folderId: args?.folderId,
      teamId: input.teamId,
      type: args.type,
      userId: actor.userId,
      isAdmin: actor.isOwner || actor.isAdmin || actor.isTeamModerator,
    });

    this.workspace.structure = newStructure;

    await this.workspace.saveStructure(revision);
  }

  async createGroup(
    input: WorkspaceInputs["createGroup"],
    actor: ResourceActor,
    revision?: number,
  ) {
    const newStructure = createGroupMutation({
      currentUserId: actor.userId,
      structure: this.workspace.structure,
      group: input,
    });

    this.workspace.structure = newStructure;

    await this.workspace.saveStructure(revision);
  }

  async updateGroup(
    input: WorkspaceInputs["updateGroup"],
    actor: ResourceActor,
    revision?: number,
  ) {
    const { groupId, groupUpdate } = input;
    const curMembers = this.workspace.members.members.map((m) => m.id);
    const newStructure = groupUpdateRunner({
      structure: this.workspace.structure,
      groupUpdate,
      groupId,
      curMembers,
    }) as WorkspaceStructure;

    this.workspace.structure = newStructure;

    await this.workspace.saveStructure(revision);
  }

  async createTeam(
    input: WorkspaceInputs["createTeam"],
    actor: ResourceActor,
    revision?: number,
  ) {
    const newStructure = createTeamMutation({
      currentUserId: actor.userId,
      structure: this.workspace.structure,
      team: input,
    });

    this.workspace.structure = newStructure;

    await this.workspace.saveStructure(revision);
  }

  async updatePage(
    input: WorkspaceInputs["updatePage"],
    actor: ResourceActor,
    revision?: number,
  ) {
    const { folderId, teamId, ...page } = input;

    if (!folderId || !teamId || !page) {
      throw workspaceError(
        "WORKSPACE_INVALID_INPUT",
        "Workspace operation input is incomplete",
      );
    }

    const newStructure = updatePageMutation({
      structure: this.workspace.structure,
      folderId,
      teamId,
      page,
    });

    this.workspace.structure = newStructure;

    await this.workspace.saveStructure(revision);
  }

  async createThread(
    input: WorkspaceInputs["createThread"],
    actor: ResourceActor,
    revision?: number,
  ) {
    const { teamId, ...thread } = input;
    const newStructure = createThreadMutation({
      curUserId: actor.userId,
      structure: this.workspace.structure,
      teamId,
      thread,
    });

    this.workspace.structure = newStructure;

    await this.workspace.saveStructure(revision);
  }

  async createRoom(
    input: WorkspaceInputs["createRoom"],
    actor: ResourceActor,
    revision?: number,
  ) {
    const { teamId, ...room } = input;

    if (!teamId || !room) {
      throw workspaceError(
        "WORKSPACE_INVALID_INPUT",
        "Workspace operation input is incomplete",
      );
    }

    const newStructure = createRoomMutation({
      structure: this.workspace.structure,
      teamId,
      room,
    });

    this.workspace.structure = newStructure;

    await this.workspace.saveStructure(revision);
  }

  async updateFolder(
    input: WorkspaceInputs["updateFolder"],
    actor: ResourceActor,
    revision?: number,
  ) {
    const { teamId, ...folder } = input;

    if (!teamId || !folder) {
      throw workspaceError(
        "WORKSPACE_INVALID_INPUT",
        "Workspace operation input is incomplete",
      );
    }

    const newStructure = updateFolderMutation({
      structure: this.workspace.structure,
      teamId,
      folder,
    });

    this.workspace.structure = newStructure;

    await this.workspace.saveStructure(revision);
  }

  async updateTeam(
    input: WorkspaceInputs["updateTeam"],
    actor: ResourceActor,
    revision?: number,
  ) {
    const { teamId, teamUpdate } = input;
    const curMembers = this.workspace.members.members.map((m) => m.id);
    const newStructure = teamUpdateRunner({
      structure: this.workspace.structure,
      teamUpdate,
      teamId,
      curMembers,
    }) as WorkspaceStructure;

    this.workspace.structure = newStructure;

    await this.workspace.saveStructure(revision);
  }

  async updateThread(
    input: WorkspaceInputs["updateThread"],
    actor: ResourceActor,
    revision?: number,
  ) {
    const { teamId, ...thread } = input;

    if (!teamId || !thread) {
      throw workspaceError(
        "WORKSPACE_INVALID_INPUT",
        "Workspace operation input is incomplete",
      );
    }

    const newStructure = updateThreadMutation({
      structure: this.workspace.structure,
      teamId,
      thread,
      userId: actor.userId,
    });

    this.workspace.structure = newStructure;

    await this.workspace.saveStructure(revision);
  }
}

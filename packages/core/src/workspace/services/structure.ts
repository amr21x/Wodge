import { inject, injectable } from "tsyringe";
import { WorkspaceStateRepository } from "@wodge/core/workspace/repositories/state";
import { workspaceError } from "@wodge/core/workspace/errors";
import type { ResourceActor, Channel } from "@wodge/domain/channels/index";
import type { WorkspaceInputs } from "@wodge/domain/workspace/dto";
import type { Team } from "@wodge/domain/workspace/models";

@injectable()
export class WorkspaceService {
  constructor(
    @inject(WorkspaceStateRepository) private readonly workspace: Pick<
      WorkspaceStateRepository,
      keyof WorkspaceStateRepository
    >,
  ) {}
  private requireTeam(id: string) {
    if (!this.workspace.team(id))
      throw workspaceError("WORKSPACE_NOT_FOUND", "Team not found");
  }
  private requireFolder(teamId: string, id: string) {
    if (!this.workspace.folder(teamId, id))
      throw workspaceError("WORKSPACE_NOT_FOUND", "Folder not found");
  }
  async createTeam(
    input: WorkspaceInputs["createTeam"],
    actor: ResourceActor,
    revision?: number,
  ) {
    return this.workspace.change(revision, () => {
      if (this.workspace.team(input.id))
        throw workspaceError("WORKSPACE_CONFLICT", "Team already exists");
      const team: Team = {
        ...input,
        createdBy: actor.userId,
        members: [actor.userId],
        moderators: [],
        folders: [{ id: "root-" + input.id, name: "root", channels: [] }],
        rooms: [],
        threads: [],
        default: false,
      };
      this.workspace.insertTeam(team);
    });
  }
  async deleteTeam(
    id: WorkspaceInputs["deleteTeam"],
    actor: ResourceActor,
    revision?: number,
  ) {
    return this.workspace.change(revision, () => {
      if (this.workspace.teamCount() === 1)
        throw workspaceError(
          "WORKSPACE_CONFLICT",
          "Cannot delete the last team",
        );
      this.requireTeam(id);
      this.workspace.deleteTeam(id);
    });
  }
  async createPage(
    input: WorkspaceInputs["createPage"],
    actor: ResourceActor,
    revision?: number,
  ) {
    return this.createChannel(
      input.teamId,
      "page",
      input,
      revision,
      input.folderId,
    );
  }
  async createRoom(
    input: WorkspaceInputs["createRoom"],
    actor: ResourceActor,
    revision?: number,
  ) {
    return this.createChannel(input.teamId, "room", input, revision);
  }
  async createThread(
    input: WorkspaceInputs["createThread"],
    actor: ResourceActor,
    revision?: number,
  ) {
    return this.createChannel(input.teamId, "thread", input, revision);
  }
  private createChannel(
    teamId: string,
    kind: "page" | "room" | "thread",
    channel: Channel,
    revision?: number,
    folderId?: string,
  ) {
    return this.workspace.change(revision, () => {
      this.requireTeam(teamId);
      if (folderId) this.requireFolder(teamId, folderId);
      if (this.workspace.channel(teamId, kind, channel.id))
        throw workspaceError("WORKSPACE_CONFLICT", "Channel already exists");
      this.workspace.insertChannel(teamId, kind, channel, folderId);
    });
  }
  async updatePage(
    input: WorkspaceInputs["updatePage"],
    actor: ResourceActor,
    revision?: number,
  ) {
    return this.updateChannel(
      input.teamId,
      "page",
      input,
      revision,
      input.folderId,
    );
  }
  async updateRoom(
    input: WorkspaceInputs["updateRoom"],
    actor: ResourceActor,
    revision?: number,
  ) {
    return this.updateChannel(input.teamId, "room", input, revision);
  }
  async updateThread(
    input: WorkspaceInputs["updateThread"],
    actor: ResourceActor,
    revision?: number,
  ) {
    return this.updateChannel(input.teamId, "thread", input, revision);
  }
  private updateChannel(
    teamId: string,
    kind: "page" | "room" | "thread",
    channel: Channel,
    revision?: number,
    folderId?: string,
  ) {
    return this.workspace.change(revision, () => {
      this.requireTeam(teamId);
      if (folderId) this.requireFolder(teamId, folderId);
      const stored = this.workspace.channel(teamId, kind, channel.id);
      if (!stored || (folderId && stored.folder_id !== folderId))
        throw workspaceError("WORKSPACE_NOT_FOUND", "Channel not found");
      this.workspace.updateChannel(teamId, kind, channel);
    });
  }
  async deleteChannel(
    input: WorkspaceInputs["deleteChannel"],
    actor: ResourceActor,
    revision?: number,
  ) {
    return this.workspace.change(revision, () => {
      this.requireTeam(input.teamId);
      if (input.type === "page")
        this.requireFolder(input.teamId, input.folderId ?? "");
      if (input.type !== "resources")
        this.workspace.deleteChannel(
          input.teamId,
          input.type,
          input.channelId,
          input.folderId,
        );
    });
  }
  async updateFolder(
    input: WorkspaceInputs["updateFolder"],
    actor: ResourceActor,
    revision?: number,
  ) {
    return this.workspace.change(revision, () => {
      this.requireTeam(input.teamId);
      this.requireFolder(input.teamId, input.id);
      this.workspace.updateFolder(input.teamId, input);
    });
  }
  async deleteFolder(
    input: WorkspaceInputs["deleteFolder"],
    actor: ResourceActor,
    revision?: number,
  ) {
    return this.workspace.change(revision, () => {
      this.requireTeam(input.teamId);
      this.requireFolder(input.teamId, input.folderId);
      this.workspace.deleteFolder(input.teamId, input.folderId);
    });
  }
  async updateTeam(
    input: WorkspaceInputs["updateTeam"],
    actor: ResourceActor,
    revision?: number,
  ) {
    return this.workspace.change(revision, () => {
      const { teamId, teamUpdate } = input;
      this.requireTeam(teamId);
      switch (teamUpdate.action) {
        case "updateInfo":
          this.workspace.updateTeam(teamId, teamUpdate.update);
          break;
        case "addMembers": {
          const members = teamUpdate.update.members;
          if (members.some((id) => !this.workspace.workspaceMember(id)))
            throw workspaceError("WORKSPACE_INVALID_INPUT", "Invalid members");
          const existing = new Set(
            this.workspace.teamMembers(teamId, "member"),
          );
          for (const id of members)
            if (!existing.has(id)) {
              this.workspace.addTeamMember(teamId, "member", id);
              existing.add(id);
            }
          break;
        }
        case "removeMembers":
          this.workspace.removeTeamMembers(
            teamId,
            "member",
            teamUpdate.update.members,
          );
          break;
        case "changeTeamMemberRole":
          if (teamUpdate.update.role === "moderator")
            this.workspace.addTeamMember(
              teamId,
              "moderator",
              teamUpdate.update.memberId,
            );
          else
            this.workspace.removeTeamMembers(teamId, "moderator", [
              teamUpdate.update.memberId,
            ]);
          break;
        case "addFolder": {
          const folder = { ...teamUpdate.update.folder, channels: [] };
          if (this.workspace.folder(teamId, folder.id))
            throw workspaceError(
              "WORKSPACE_CONFLICT",
              "Folder already exists in team",
            );
          if (folder.parentFolder)
            this.requireFolder(teamId, folder.parentFolder);
          this.workspace.insertFolder(teamId, folder);
          break;
        }
        case "removeFolders":
          for (const id of teamUpdate.update.folders)
            this.workspace.deleteFolder(teamId, id);
          break;
      }
    });
  }
}

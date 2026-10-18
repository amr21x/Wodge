import {
  createDefaultTeam,
  defaultWorkspaceMembers,
  defaultWorkspaceStructure,
} from "@wodge/core/workspace/defaults";
import { WorkspaceLifecycleRepository } from "@wodge/core/workspace/repositories/lifecycle";
import { produce } from "immer";
import { inject, injectable } from "tsyringe";

@injectable()
export class WorkspaceLifecycle {
  constructor(
    @inject(WorkspaceLifecycleRepository)
    private readonly workspace: Pick<
      WorkspaceLifecycleRepository,
      keyof WorkspaceLifecycleRepository
    >,
  ) {}

  get initialized() {
    return !!this.workspace.members.createdBy;
  }
  memberIds() {
    return this.workspace.members.members.map((member) => member.id);
  }
  roomScopes() {
    return this.workspace.structure.teams.flatMap((team) =>
      team.rooms.map((room) => ({ teamId: team.id, roomId: room.id })),
    );
  }

  async setPresence(userId: string, connect: boolean) {
    if (
      this.workspace.members.createdBy !== userId &&
      !this.workspace.members.members.some((member) => member.id === userId)
    ) {
      return false;
    }

    if (connect) {
      this.workspace.presence.set(userId, true);
    } else {
      this.workspace.presence.delete(userId);
    }

    await this.workspace.savePresence();

    return true;
  }

  async createWorkspace(userId: string) {
    if (this.workspace.members.createdBy) {
      return true;
    }
    this.workspace.members = produce(this.workspace.members, (draft) => {
      draft.createdBy = userId;
      draft.members.push({
        id: userId,
        role: "owner",
        joinInfo: {
          joinedAt: new Date().toISOString(),
          token: "",
          createdBy: "",
        },
      });
    });
    this.workspace.structure = produce(this.workspace.structure, (draft) => {
      return {
        ...defaultWorkspaceStructure(),
        teams: [createDefaultTeam(userId)],
      };
    });
    this.workspace.presence.set(userId, true);

    await this.workspace.saveCreatedWorkspace();

    return true;
  }

  async deleteWorkspace() {
    this.workspace.members = defaultWorkspaceMembers();
    this.workspace.structure = defaultWorkspaceStructure();
    this.workspace.presence = new Map();

    await this.workspace.saveDeletedWorkspace();

    return true;
  }

  /** Replace the local membership projection with Better Auth's current D1 state. */
  async synchronizeMembers(members: { userId: string; role: string }[]) {
    const owner = members.find((member) =>
      member.role.split(",").includes("owner"),
    );
    if (!owner) {
      throw new Error("Workspace organization has no owner");
    }
    if (
      !this.workspace.members.createdBy &&
      !(await this.createWorkspace(owner.userId))
    ) {
      throw new Error("Workspace provisioning failed");
    }
    const previous = this.workspace.members.members;
    const ids = new Set(members.map((member) => member.userId));
    const addedIds = members
      .filter(
        (member) => !previous.some((record) => record.id === member.userId),
      )
      .map((member) => member.userId);
    for (const member of previous) {
      if (!ids.has(member.id)) this.workspace.presence.delete(member.id);
    }
    this.workspace.members = {
      createdBy: owner.userId,
      members: members.map((member) => ({
        id: member.userId,
        role: member.role.split(",").includes("owner")
          ? "owner"
          : member.role.split(",").includes("admin")
            ? "admin"
            : "member",
        joinInfo: previous.find((record) => record.id === member.userId)
          ?.joinInfo ?? {
          joinedAt: new Date().toISOString(),
          token: "",
          createdBy: "",
        },
      })),
    };
    this.workspace.structure = produce(this.workspace.structure, (draft) => {
      for (const team of draft.teams) {
        team.members = team.members.filter((id) => ids.has(id));
        team.moderators = team.moderators.filter((id) => ids.has(id));
        if (team.default) {
          team.members = [...new Set([...team.members, ...addedIds])];
        }
      }
      for (const group of draft.groups) {
        group.members = group.members.filter((id) => ids.has(id));
      }
    });
    await this.workspace.saveMembershipProjection();
  }

  async refreshMembers() {
    await this.workspace.saveMemberUpdate();

    return true;
  }

  async updateWorkspace() {
    await this.workspace.saveWorkspaceUpdate();

    return true;
  }
}

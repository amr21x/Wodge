import { AccountService } from "@wodge/core/user/services/account";
import { workspaceMemberLimit } from "@wodge/core/workspace/policy";
import { WorkspaceRepository } from "@wodge/core/workspace/repositories/directory";
import { nanoid } from "nanoid";
import { inject, injectable } from "tsyringe";

@injectable()
export class WorkspaceDirectory {
  constructor(
    @inject(WorkspaceRepository)
    private readonly repository: Pick<
      WorkspaceRepository,
      | "getWorkspaceById"
      | "getInvite"
      | "countMembers"
      | "getMembership"
      | "getMemberIds"
      | "ensureInvite"
      | "saveInvite"
      | "toggleInvite"
      | "getInvites"
    >,
    @inject(AccountService)
    private readonly users: Pick<AccountService, "getUserInfoById">,
  ) {}

  ensureInvite(userId: string, workspaceId: string) {
    return this.repository.ensureInvite(workspaceId, nanoid(8), userId);
  }

  async validateJoin(userId: string, workspaceId: string, token: string) {
    const invite = await this.repository.getInvite(workspaceId, token);
    const workspace = await this.repository.getWorkspaceById(workspaceId);
    if (!invite || !workspace?.isInviteLinkEnabled) return null;
    if (await this.repository.getMembership(userId, workspaceId)) return invite;
    if (
      (await this.repository.countMembers(workspaceId)) >=
      workspaceMemberLimit(workspace.isPremium)
    )
      return null;
    return invite;
  }

  async members(userId: string, workspaceId: string) {
    const repository = this.repository;

    if (!(await repository.getMembership(userId, workspaceId))) {
      return { error: "unauthorized" } as const;
    }

    const ids = await repository.getMemberIds(workspaceId);
    const members = await this.users.getUserInfoById(
      ids.map((member) => member.userId),
    );

    if (members === null) {
      return { error: "not-found" } as const;
    }

    return { members };
  }

  listInvites(workspaceId: string) {
    return this.repository.getInvites(workspaceId);
  }
  rotateInvite(userId: string, workspaceId: string) {
    return this.repository.saveInvite(workspaceId, nanoid(8), userId);
  }
  toggleInvite(workspaceId: string) {
    return this.repository.toggleInvite(workspaceId);
  }
}

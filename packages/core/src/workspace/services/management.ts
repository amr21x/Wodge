import { workspaceError } from "@wodge/core/workspace/errors";
import { WorkspaceRepository } from "@wodge/core/workspace/repositories/directory";
import { inject, injectable } from "tsyringe";

@injectable()
export class WorkspaceManagement {
  constructor(
    @inject(WorkspaceRepository)
    private readonly workspaces: Pick<
      WorkspaceRepository,
      | "getWorkspacesByUserId"
      | "getWorkspaceById"
      | "getInviteWithCreator"
      | "getMembership"
    >,
  ) {}

  get(workspaceId: string) {
    return this.workspaces.getWorkspaceById(workspaceId);
  }

  async list(userId: string) {
    return (await this.workspaces.getWorkspacesByUserId(userId)).map(
      (row) => row.workspaces,
    );
  }

  async preview(workspaceId: string, token: string, userId: string) {
    const [data, workspace, membership] = await Promise.all([
      this.workspaces.getInviteWithCreator(workspaceId, token),
      this.workspaces.getWorkspaceById(workspaceId),
      this.workspaces.getMembership(userId, workspaceId),
    ]);
    return { data, workspace, membership };
  }

  async requireMember(userId: string, workspaceId: string) {
    if (!(await this.workspaces.getMembership(userId, workspaceId))) {
      throw workspaceError(
        "WORKSPACE_FORBIDDEN",
        "Active workspace membership is required",
      );
    }
  }
}

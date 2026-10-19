import { UserWorkspaceRepository } from "@wodge/core/user/repositories/workspaces";
import { inject, injectable } from "tsyringe";

@injectable()
export class UserService {
  constructor(
    @inject(UserWorkspaceRepository)
    private readonly workspaces: Pick<
      UserWorkspaceRepository,
      "list" | "add" | "remove"
    >,
  ) {}
  listWorkspaceIds() {
    return this.workspaces.list();
  }
  addWorkspace(workspaceId: string) {
    return this.workspaces.add(workspaceId);
  }
  removeWorkspace(workspaceId: string) {
    return this.workspaces.remove(workspaceId);
  }
}

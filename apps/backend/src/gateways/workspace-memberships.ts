import { inject, injectable } from "tsyringe";
import { UserGateway } from "./user";

/** Apply membership projections to user objects for this workspace. */
@injectable()
export class WorkspaceMemberships {
  constructor(
    @inject(UserGateway) private readonly users: UserGateway,
    @inject("objectId") private readonly workspaceId: string,
  ) {}

  add(userId: string) {
    return this.users.addWorkspace(userId, this.workspaceId);
  }

  remove(userId: string) {
    return this.users.removeWorkspace(userId, this.workspaceId);
  }
}

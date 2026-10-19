import { inject, injectable } from "tsyringe";
import type UserServer from "../servers/user";
import { WorkspaceGateway } from "./workspace";

@injectable()
export class UserNotifications {
  constructor(
    @inject("user") private readonly user: UserServer,
    @inject(WorkspaceGateway) private readonly workspaces: WorkspaceGateway,
  ) {}

  removed(workspaceId: string) {
    return this.user.poke({ type: "deleteWorkspace", id: workspaceId });
  }

  updateMember(workspaceId: string) {
    return this.workspaces.refreshMemberProfiles(workspaceId);
  }
}

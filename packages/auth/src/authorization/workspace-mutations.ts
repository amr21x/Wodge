import {
  isAdmin,
  isOwner,
  isTeamModerator,
} from "@wodge/auth/authorization/access";
import { workspaceError } from "@wodge/core/workspace/errors";
import { WorkspaceStateRepository } from "@wodge/core/workspace/repositories/state";
import type { ResourceActor } from "@wodge/domain/channels/index";
import { inject, injectable } from "tsyringe";

/** Legacy workspace mutation gates, evaluated before calling a business operation. */
@injectable()
export class WorkspaceMutationAccess {
  constructor(
    @inject(WorkspaceStateRepository)
    private readonly workspace: WorkspaceStateRepository,
  ) {}

  authorize(name: string, input: unknown, actor: ResourceActor): ResourceActor {
    const isOwnerFlag = !!isOwner({
      members: this.workspace.members,
      userId: actor.userId,
    });
    const isAdminFlag = !!isAdmin({
      members: this.workspace.members,
      userId: actor.userId,
    });
    const teamId =
      typeof input === "object" && input !== null && "teamId" in input
        ? String(input.teamId)
        : undefined;
    const moderator = isTeamModerator({
      structure: this.workspace.structure,
      userId: actor.userId,
      teamId,
    });
    const administrative = [
      "createGroup",
      "deleteGroup",
      "updateGroup",
      "createTeam",
      "deleteTeam",
      "updateTeam",
    ].includes(name);
    const channelEdit =
      [
        "createPage",
        "updatePage",
        "createRoom",
        "updateRoom",
        "createThread",
        "deleteFolder",
      ].includes(name) ||
      (name === "deleteChannel" &&
        typeof input === "object" &&
        input !== null &&
        "type" in input &&
        (input.type === "page" || input.type === "room"));
    if (
      (administrative && !isOwnerFlag && !isAdminFlag) ||
      (channelEdit && !isOwnerFlag && !isAdminFlag && !moderator)
    ) {
      throw workspaceError(
        "WORKSPACE_FORBIDDEN",
        "Workspace operation is forbidden",
      );
    }
    return {
      ...actor,
      isOwner: isOwnerFlag,
      isAdmin: isAdminFlag,
      isTeamModerator: moderator,
    };
  }
}

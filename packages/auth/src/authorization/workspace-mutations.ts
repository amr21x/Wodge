import { WorkspaceAuthorization } from "@wodge/auth/authorization/service";
import { containsPermissions } from "@wodge/auth/authorization/policy";
import { workspaceError } from "@wodge/core/workspace/errors";
import type { ResourceActor } from "@wodge/domain/channels/index";
import { inject, injectable } from "tsyringe";

@injectable()
export class WorkspaceMutationAccess {
  constructor(
    @inject(WorkspaceAuthorization)
    private readonly authorization: WorkspaceAuthorization,
    @inject("objectId") private readonly workspaceId: string,
  ) {}
  async authorize(
    name: string,
    input: unknown,
    actor: ResourceActor,
  ): Promise<ResourceActor> {
    const administrative = ["createTeam", "deleteTeam", "updateTeam"].includes(
      name,
    );
    const structural = [
      "createPage",
      "updatePage",
      "createRoom",
      "updateRoom",
      "createThread",
      "updateThread",
      "deleteFolder",
      "updateFolder",
      "deleteChannel",
    ].includes(name);
    if (!administrative && !structural) return actor;
    const teamId =
      typeof input === "object" && input !== null && "teamId" in input
        ? String(input.teamId)
        : undefined;
    const scope = teamId
      ? { type: "team" as const, id: teamId }
      : { type: "workspace" as const, id: this.workspaceId };
    const permissions = await this.authorization.permissionsForUser(
      actor.userId,
      scope,
    );
    const canManage = containsPermissions(permissions, {
      workspace: ["manage"],
    });
    const canManageTeam =
      teamId && containsPermissions(permissions, { team: ["manageMembers"] });
    if (!canManage && !(canManageTeam && (name === "updateTeam" || structural)))
      throw workspaceError(
        "WORKSPACE_FORBIDDEN",
        "Workspace operation is forbidden",
      );
    return {
      ...actor,
      isOwner: false,
      isAdmin: canManage,
      isTeamModerator: !!canManageTeam,
      canEdit: true,
      permissions,
    };
  }
}

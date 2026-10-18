import { NewWorkspaceSchema } from "@wodge/domain/workspace/validation";
import {
  UpdateWorkspaceBody,
  MemberRoleBody,
} from "../../validators/workspace";
import { jsonBody } from "../../validators/json";
import { Hono } from "hono";
import { inject, injectable } from "tsyringe";
import { WorkspaceHandlers } from "../../handlers/api/workspace";
import type { ApiContext } from "../../types/hono-context";
@injectable()
export class WorkspaceApiRoutes {
  readonly router: ReturnType<typeof WorkspaceApiRoutes.define>["router"];
  readonly directory: ReturnType<typeof WorkspaceApiRoutes.define>["directory"];

  constructor(@inject(WorkspaceHandlers) handlers: WorkspaceHandlers) {
    const routes = WorkspaceApiRoutes.define(handlers);
    this.router = routes.router;
    this.directory = routes.directory;
  }
  private static define(handlers: WorkspaceHandlers) {
    const router = new Hono<ApiContext>();
    const directory = new Hono<ApiContext>();

    const withCreateWorkspace = router.post(
      "/new",
      jsonBody(NewWorkspaceSchema),
      handlers.createWorkspace,
    );
    const withPreviewInvite = withCreateWorkspace.get(
      "/preview/:slug/:token",
      handlers.previewInvite,
    );
    const withMembers = withPreviewInvite.get(
      "/:workspaceId/members",
      handlers.members,
    );
    const withUpdateWorkspace = withMembers.post(
      "/:workspaceId/update",
      jsonBody(UpdateWorkspaceBody),
      handlers.updateWorkspace,
    );
    const withLeaveWorkspace = withUpdateWorkspace.post(
      "/:workspaceId/leave",
      handlers.leaveWorkspace,
    );
    const withDeleteWorkspace = withLeaveWorkspace.delete(
      "/:workspaceId",
      handlers.deleteWorkspace,
    );
    const withJoinWorkspace = withDeleteWorkspace.post(
      "/:workspaceId/join/:token",
      handlers.joinWorkspace,
    );
    const withRemoveMember = withJoinWorkspace.delete(
      "/:workspaceId/members/:memberId",
      handlers.removeMember,
    );
    const withUpdateMemberRole = withRemoveMember.patch(
      "/:workspaceId/members/:memberId/role",
      jsonBody(MemberRoleBody),
      handlers.updateMemberRole,
    );
    const withInvites = withUpdateMemberRole.on(
      ["GET", "POST", "PATCH"],
      "/:workspaceId/invite",
      handlers.invites,
    );
    const withWorkspaceDirectory = directory.get("/", handlers.listWorkspaces);

    return { router: withInvites, directory: withWorkspaceDirectory };
  }
}

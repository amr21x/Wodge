import type { JsonContext } from "../../validators/json";
import { BetterAuthMembership } from "@wodge/auth/membership";
import { workspaceError } from "@wodge/core/workspace/errors";
import { WorkspaceDirectory } from "@wodge/core/workspace/services/directory";
import { WorkspaceManagement } from "@wodge/core/workspace/services/management";
import { NewWorkspaceSchema } from "@wodge/domain/workspace/validation";
import type { Context } from "hono";
import { inject, injectable } from "tsyringe";
import { WorkspaceGateway } from "../../gateways/workspace";
import type { ApiContext } from "../../types/hono-context";
import {
  JoinParams,
  MemberParams,
  MemberRoleBody,
  PreviewParams,
  UpdateWorkspaceBody,
  WorkspaceParams,
} from "../../validators/workspace";

@injectable()
export class WorkspaceHandlers {
  constructor(
    @inject(BetterAuthMembership)
    private readonly memberships: BetterAuthMembership,
    @inject(WorkspaceGateway) private readonly gateway: WorkspaceGateway,
    @inject(WorkspaceDirectory) private readonly directory: WorkspaceDirectory,
    @inject(WorkspaceManagement)
    private readonly management: WorkspaceManagement,
  ) {}

  createWorkspace = async (
    c: JsonContext<ApiContext, typeof NewWorkspaceSchema>,
  ) => {
    const data = c.req.valid("json");
    const userId = c.get("user").id;
    const organization = await this.memberships.create(
      { ...data, owner: userId },
      c.req.raw.headers,
    );
    await this.gateway.synchronizeOrganization(organization.id);
    const result = {
      workspace: await this.management.get(organization.id),
    };

    return c.json({ workspace: result.workspace }, 201);
  };

  listWorkspaces = async (c: Context<ApiContext>) => {
    return c.json(await this.management.list(c.get("user").id), 200);
  };

  previewInvite = async (c: Context<ApiContext>) => {
    return c.json(
      await this.management.preview(
        PreviewParams.parse(c.req.param()).slug,
        PreviewParams.parse(c.req.param()).token,
        c.get("user").id,
      ),
      200,
    );
  };

  joinWorkspace = async (c: Context<ApiContext>) => {
    const invite = await this.directory.validateJoin(
      c.get("user").id,
      WorkspaceParams.parse(c.req.param()).workspaceId,
      JoinParams.parse(c.req.param()).token,
    );

    if (invite) {
      await this.memberships.join(
        WorkspaceParams.parse(c.req.param()).workspaceId,
        c.get("user").id,
      );
      await this.gateway.synchronizeOrganization(
        WorkspaceParams.parse(c.req.param()).workspaceId,
      );
    }
    return invite
      ? c.json({ invite }, 200)
      : c.json({ error: "Invalid invite" }, 400);
  };

  members = async (c: Context<ApiContext>) => {
    const result = await this.directory.members(
      c.get("user").id,
      WorkspaceParams.parse(c.req.param()).workspaceId,
    );

    return "members" in result
      ? c.json(result.members, 200)
      : c.json(result, result.error === "unauthorized" ? 403 : 404);
  };

  updateWorkspace = async (
    c: JsonContext<ApiContext, typeof UpdateWorkspaceBody>,
  ) => {
    const changes = c.req.valid("json");

    const { workspaceId } = WorkspaceParams.parse(c.req.param());
    await this.requireAdmin(c.get("user").id, workspaceId);
    await this.memberships.update(workspaceId, changes, c.req.raw.headers);
    await this.gateway.refreshMetadata(workspaceId);

    return c.body(null, 204);
  };

  leaveWorkspace = async (c: Context<ApiContext>) => {
    const { workspaceId } = WorkspaceParams.parse(c.req.param());
    await this.management.requireMember(c.get("user").id, workspaceId);
    await this.memberships.removeMember(
      workspaceId,
      c.get("user").id,
      c.req.raw.headers,
    );
    await this.gateway.synchronizeOrganization(workspaceId);

    return c.body(null, 204);
  };

  deleteWorkspace = async (c: Context<ApiContext>) => {
    const { workspaceId } = WorkspaceParams.parse(c.req.param());
    await this.requireAdmin(c.get("user").id, workspaceId);
    await this.memberships.remove(workspaceId, c.req.raw.headers);
    await this.gateway.synchronizeOrganization(workspaceId, true);

    return c.body(null, 204);
  };

  removeMember = async (c: Context<ApiContext>) => {
    const { workspaceId } = WorkspaceParams.parse(c.req.param());
    const memberId = MemberParams.parse(c.req.param()).memberId;
    await this.requireAdmin(c.get("user").id, workspaceId);
    await this.management.requireMember(memberId, workspaceId);
    await this.memberships.removeMember(
      workspaceId,
      memberId,
      c.req.raw.headers,
    );
    await this.gateway.synchronizeOrganization(workspaceId);

    return c.body(null, 204);
  };

  invites = async (c: Context<ApiContext>) => {
    const { workspaceId } = WorkspaceParams.parse(c.req.param());
    await this.requireAdmin(c.get("user").id, workspaceId);

    if (c.req.method === "GET") {
      return c.json(
        { invites: await this.directory.listInvites(workspaceId) },
        200,
      );
    }

    if (c.req.method === "POST") {
      return c.json(
        await this.directory.rotateInvite(c.get("user").id, workspaceId),
        200,
      );
    }

    await this.directory.toggleInvite(workspaceId);

    return c.body(null, 204);
  };
  updateMemberRole = async (
    c: JsonContext<ApiContext, typeof MemberRoleBody>,
  ) => {
    const { workspaceId, memberId } = MemberParams.parse(c.req.param());
    const { role } = c.req.valid("json");
    await this.requireAdmin(c.get("user").id, workspaceId);
    await this.memberships.updateMemberRole(
      workspaceId,
      memberId,
      role,
      c.req.raw.headers,
    );
    await this.gateway.synchronizeOrganization(workspaceId);
    return c.body(null, 204);
  };

  private async requireAdmin(userId: string, workspaceId: string) {
    if (!(await this.memberships.isAdmin(userId, workspaceId))) {
      throw workspaceError(
        "WORKSPACE_FORBIDDEN",
        "Workspace administrator access is required",
      );
    }
  }
}

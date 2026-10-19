import { workspaceError } from "@wodge/core/workspace/errors";
import { OrganizationRepository } from "@wodge/core/workspace/repositories/organizations";
import type { AuthorizationPrincipal } from "@wodge/domain/authorization/models";
import type { Workspace } from "@wodge/domain/workspace/models";
import { APIError } from "better-auth/api";
import { inject, injectable } from "tsyringe";
import type { AuthInstance } from "./server";

// D1 organization membership is authoritative; resource role assignments remain in the workspace DO.
@injectable()
export class BetterAuthMembership {
  constructor(
    @inject(OrganizationRepository)
    private readonly repository: OrganizationRepository,
    @inject("auth") private readonly auth: AuthInstance,
  ) {}

  private organization(workspaceId: string) {
    return this.repository.organization(workspaceId);
  }

  async validate(principal: AuthorizationPrincipal, workspaceId: string) {
    const checkedAt = Date.now();
    const session = await this.repository.session(
      principal.userId,
      principal.sessionId,
    );
    if (
      !session ||
      session.expiresAt.getTime() <= checkedAt ||
      !(await this.hasMember(principal.userId, workspaceId))
    )
      return null;
    return {
      expiresAt: Math.min(session.expiresAt.getTime(), checkedAt + 30_000),
    };
  }

  async isAdmin(userId: string, workspaceId: string) {
    const member = await this.repository.member(userId, workspaceId);
    return !!member?.role
      .split(",")
      .some((role) => role === "owner" || role === "admin");
  }

  async hasMember(userId: string, workspaceId: string) {
    return !!(await this.repository.member(userId, workspaceId));
  }

  async create(
    workspace: Pick<Workspace, "name" | "slug" | "owner">,
    headers: Headers,
  ) {
    const organization = await identityOperation(
      this.auth.api.createOrganization({
        headers,
        body: {
          name: workspace.name,
          slug: workspace.slug,
        },
      }),
    );
    if (!organization) {
      throw new Error("Unable to create workspace");
    }
    return organization;
  }

  async update(
    workspaceId: string,
    changes: { name?: string; slug?: string; avatar?: string | null },
    headers: Headers,
  ) {
    await identityOperation(
      this.auth.api.updateOrganization({
        headers: headers,
        body: {
          organizationId: workspaceId,
          data: {
            name: changes.name,
            slug: changes.slug,
            ...(changes.avatar !== undefined && { logo: changes.avatar }),
          },
        },
      }),
    );
  }

  async remove(workspaceId: string, headers: Headers) {
    await identityOperation(
      this.auth.api.deleteOrganization({
        headers: headers,
        body: { organizationId: workspaceId },
      }),
    );
  }

  async join(workspaceId: string, userId: string) {
    const organization = await this.organization(workspaceId);
    if (!organization) {
      throw new Error("Workspace organization is missing");
    }
    if (!(await this.hasMember(userId, workspaceId))) {
      await identityOperation(
        this.auth.api.addMember({
          body: { userId, organizationId: organization.id, role: "member" },
        }),
      );
    }
  }

  async updateMemberRole(
    workspaceId: string,
    userId: string,
    role: "owner" | "admin" | "member",
    headers: Headers,
  ) {
    const member = await this.repository.member(userId, workspaceId);
    if (!member)
      throw workspaceError("WORKSPACE_NOT_FOUND", "Member not found");
    await identityOperation(
      this.auth.api.updateMemberRole({
        headers,
        body: { organizationId: workspaceId, memberId: member.id, role },
      }),
    );
  }

  async removeMember(workspaceId: string, userId: string, headers: Headers) {
    if (headers) {
      const session = await this.auth.api.getSession({
        headers: headers,
      });
      if (session?.user.id === userId) {
        await identityOperation(
          this.auth.api.leaveOrganization({
            headers: headers,
            body: { organizationId: workspaceId },
          }),
        );
      } else {
        const member = await this.repository.member(userId, workspaceId);
        if (member) {
          await identityOperation(
            this.auth.api.removeMember({
              headers: headers,
              body: { organizationId: workspaceId, memberIdOrEmail: member.id },
            }),
          );
        }
      }
      return;
    }
    throw workspaceError(
      "WORKSPACE_FORBIDDEN",
      "Workspace membership writes require an authenticated request",
    );
  }

  async snapshot(workspaceId: string) {
    const organization = await this.repository.organization(workspaceId);
    if (!organization) return null;
    return {
      organization,
      members: await this.repository.members(workspaceId),
    };
  }
}

async function identityOperation<T>(operation: Promise<T>): Promise<T> {
  try {
    return await operation;
  } catch (error) {
    if (!(error instanceof APIError)) {
      throw error;
    }
    const message =
      error.body?.message ?? "Workspace identity operation failed";
    if (error.statusCode === 401 || error.statusCode === 403) {
      throw workspaceError("WORKSPACE_FORBIDDEN", message);
    }
    if (error.statusCode === 404) {
      throw workspaceError("WORKSPACE_NOT_FOUND", message);
    }
    if (
      error.body?.code === "ORGANIZATION_ALREADY_EXISTS" ||
      error.body?.code === "YOU_CANNOT_LEAVE_THE_ORGANIZATION_AS_THE_ONLY_OWNER"
    ) {
      throw workspaceError("WORKSPACE_CONFLICT", message);
    }
    throw workspaceError(
      error.statusCode >= 500
        ? "WORKSPACE_DEPENDENCY_FAILURE"
        : "WORKSPACE_INVALID_INPUT",
      message,
    );
  }
}

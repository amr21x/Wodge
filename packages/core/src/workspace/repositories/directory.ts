import { toUserProfile } from "@wodge/core/user/profile";
import type { WorkspaceRecord } from "@wodge/core/workspace/models";
import {
  authMembers,
  authOrganizations,
  authUsers,
} from "@wodge/domain/auth/schema/d1";
import { invites } from "@wodge/domain/workspace/schema/d1";
import type { Database } from "@wodge/infra/database/types";
import { and, count, eq, sql } from "drizzle-orm";
import { inject, injectable } from "tsyringe";

@injectable()
export class WorkspaceRepository {
  constructor(@inject("database") private readonly database: Database) {}

  private readonly fields = {
    id: authOrganizations.id,
    name: authOrganizations.name,
    slug: authOrganizations.slug,
    avatar: authOrganizations.logo,
    createdAt: authOrganizations.createdAt,
    isInviteLinkEnabled: authOrganizations.isInviteLinkEnabled,
    isPremium: authOrganizations.isPremium,
    customerId: authOrganizations.customerId,
    owner: sql<string>`COALESCE((SELECT user_id FROM auth_members WHERE organization_id = auth_organizations.id AND (',' || role || ',') LIKE '%,owner,%' ORDER BY created_at, id LIMIT 1), '')`,
  };

  async getWorkspacesByUserId(userId: string) {
    const rows = await this.database
      .select({
        workspaces: this.fields,
        memberships: {
          userId: authMembers.userId,
          workspaceId: authMembers.organizationId,
        },
      })
      .from(authMembers)
      .innerJoin(
        authOrganizations,
        eq(authOrganizations.id, authMembers.organizationId),
      )
      .where(eq(authMembers.userId, userId));
    return rows;
  }

  async getWorkspaceById(
    workspaceId: string,
  ): Promise<WorkspaceRecord | undefined> {
    const [workspace] = await this.database
      .select(this.fields)
      .from(authOrganizations)
      .where(eq(authOrganizations.id, workspaceId));
    return workspace;
  }

  async getMembership(userId: string, workspaceId: string) {
    const [membership] = await this.database
      .select({
        userId: authMembers.userId,
        workspaceId: authMembers.organizationId,
      })
      .from(authMembers)
      .where(
        and(
          eq(authMembers.userId, userId),
          eq(authMembers.organizationId, workspaceId),
        ),
      );
    return membership;
  }

  async getMemberIds(workspaceId: string) {
    return this.database
      .select({ userId: authMembers.userId })
      .from(authMembers)
      .where(eq(authMembers.organizationId, workspaceId));
  }

  async ensureInvite(workspaceId: string, token: string, createdBy: string) {
    return this.database
      .insert(invites)
      .values({ workspaceId, token, createdBy })
      .onConflictDoNothing({ target: invites.workspaceId });
  }

  async saveInvite(workspaceId: string, token: string, createdBy: string) {
    const [invite] = await this.database
      .insert(invites)
      .values({ workspaceId, token, createdBy })
      .onConflictDoUpdate({
        target: invites.workspaceId,
        set: { token, createdBy },
      })
      .returning();
    return invite;
  }

  async getInvite(workspaceId: string, token: string) {
    return this.database
      .select()
      .from(invites)
      .where(
        and(eq(invites.workspaceId, workspaceId), eq(invites.token, token)),
      )
      .get();
  }

  async countMembers(workspaceId: string) {
    const result = await this.database
      .select({ total: count() })
      .from(authMembers)
      .where(eq(authMembers.organizationId, workspaceId))
      .get();
    return result?.total ?? 0;
  }

  async toggleInvite(workspaceId: string) {
    await this.database
      .update(authOrganizations)
      .set({
        isInviteLinkEnabled: sql`1 - ${authOrganizations.isInviteLinkEnabled}`,
      })
      .where(eq(authOrganizations.id, workspaceId));
  }

  async getInvites(workspaceId: string) {
    return this.database
      .select()
      .from(invites)
      .where(eq(invites.workspaceId, workspaceId));
  }

  async getInviteWithCreator(workspaceId: string, token: string) {
    const row = await this.database
      .select()
      .from(invites)
      .innerJoin(authUsers, eq(authUsers.id, invites.createdBy))
      .where(
        and(eq(invites.token, token), eq(invites.workspaceId, workspaceId)),
      )
      .get();
    return row
      ? { invites: row.invites, users: toUserProfile(row.auth_users) }
      : undefined;
  }
}

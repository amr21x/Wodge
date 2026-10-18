import type { AuthorizationPrincipal } from "@wodge/domain/authorization/models";

export const OrganizationMembership = Symbol("OrganizationMembership");

export interface OrganizationMembership {
  validate(
    principal: AuthorizationPrincipal,
    workspaceId: string,
  ): Promise<{ expiresAt: number } | null>;
  hasMember(userId: string, workspaceId: string): Promise<boolean>;
}

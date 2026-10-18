import { GrantAuthority } from "@wodge/auth/authorization/authority";
import { OrganizationMembership } from "@wodge/auth/authorization/membership";
import { BetterAuthMembership } from "@wodge/auth/membership";
import type { DependencyContainer } from "tsyringe";
import { WorkspaceAuthorizationGateway } from "../gateways/workspace-authorization";

/** The authorization engine depends on membership capability, implemented by Better Auth. */
export function registerAdapters(container: DependencyContainer) {
  container.register(GrantAuthority, {
    useToken: WorkspaceAuthorizationGateway,
  });
  container.register(OrganizationMembership, {
    useToken: BetterAuthMembership,
  });
}

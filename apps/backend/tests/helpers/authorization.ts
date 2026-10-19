import type { ResourceGrantCache } from "@wodge/auth/authorization/grants";
import { allPermissions } from "@wodge/auth/authorization/permissions";
import type { AuthorizationPrincipal } from "@wodge/domain/authorization/models";

export function roomAuthorizationFixture(
  roomId = "room",
  workspaceId = "workspace",
) {
  return {
    async get(principal: AuthorizationPrincipal) {
      return {
        principal,
        workspaceId,
        scope: { type: "room", id: roomId },
        permissions: allPermissions(),
        policyRevision: 1,
        issuedAt: Date.now(),
        expiresAt: Date.now() + 30_000,
      };
    },
  } as unknown as ResourceGrantCache;
}

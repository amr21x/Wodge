import { ResourceGrantCache } from "@wodge/auth/authorization/grants";
import { containsPermissions } from "@wodge/auth/authorization/policy";
import { authorizationError } from "@wodge/core/authorization/errors";
import { AuthorizationPrincipalSchema } from "@wodge/domain/authorization/validation";
import type { MiddlewareHandler } from "hono";
import type { RoomContext } from "../types/hono-context";

export function roomAuthorization(
  grants: ResourceGrantCache,
): MiddlewareHandler<RoomContext> {
  return async (c, next) => {
    const parsed = AuthorizationPrincipalSchema.safeParse({
      userId: c.req.header("x-user-id"),
      sessionId: c.req.header("x-session-id"),
    });
    if (!parsed.success) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    // The workspace grants resource permissions; role flags supplied by a caller are ignored.
    const grant = await grants.get(parsed.data);
    if (!containsPermissions(grant.permissions, { room: ["read"] })) {
      throw authorizationError("AUTHORIZATION_FORBIDDEN", "Room access denied");
    }
    c.set("actor", {
      userId: parsed.data.userId,
      workspaceId: grant.workspaceId,
      permissions: grant.permissions,
      isOwner: false,
      isAdmin: false,
      isTeamModerator: false,
      canView: true,
      canEdit: containsPermissions(grant.permissions, { message: ["send"] }),
    });
    await next();
  };
}

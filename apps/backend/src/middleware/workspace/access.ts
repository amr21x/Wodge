import { WorkspaceAccess } from "@wodge/auth/authorization/workspace-access";
import { ChannelTypeSchema } from "@wodge/domain/channels/index";
import type { MiddlewareHandler } from "hono";
import type { WorkspaceContext } from "../../types/hono-context";

type Access =
  | "admin"
  | "team-read"
  | "team-write"
  | "channel-read"
  | "channel-write";

export function requireWorkspaceAccess(
  permission: Access,
  access: WorkspaceAccess,
): MiddlewareHandler<WorkspaceContext> {
  return async (c, next) => {
    const userId = c.req.header("x-user-id");
    let allowed: boolean;
    if (permission === "admin") {
      allowed = access.canManage(userId);
    } else {
      const teamId = c.req.param("teamId");
      const channelId = c.req.param("channelId");
      const channelPermission = permission.startsWith("channel-");
      if (!teamId || (channelPermission && !channelId)) {
        return c.json({ message: "TeamId is required" }, 400);
      }
      if (channelPermission) {
        const scope = {
          userId,
          teamId,
          channelId: channelId!,
          channelType: ChannelTypeSchema.parse(
            c.req.header("channelType") || "room",
          ),
          folderId: c.req.header("folderId"),
        };
        allowed =
          permission === "channel-write"
            ? await access.canEdit(scope)
            : await access.canView(scope);
      } else {
        allowed =
          access.canJoinTeam(userId, teamId) &&
          (permission === "team-read" ||
            access.canModerateTeam(userId, teamId));
      }
    }
    if (!allowed) {
      return c.json({ ok: false, error: "Unauthorized" }, 401);
    }
    await next();
  };
}

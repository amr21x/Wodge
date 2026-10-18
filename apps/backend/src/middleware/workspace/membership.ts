import { WorkspaceAccess } from "@wodge/auth/authorization/workspace-access";
import { BetterAuthMembership } from "@wodge/auth/membership";
import type { MiddlewareHandler } from "hono";
import type { WorkspaceContext } from "../../types/hono-context";

export function workspaceMembership(
  memberships: BetterAuthMembership,
  access: WorkspaceAccess,
  workspaceId: string,
): MiddlewareHandler<WorkspaceContext> {
  return async (c, next) => {
    const path = "/" + c.req.path.split("/").slice(4).join("/");

    if (path.startsWith("/service")) {
      await next();
      return;
    }
    // D1 membership is authoritative; a stale DO projection must not retain access.
    const userId = c.req.header("x-user-id");
    if (!userId || !(await memberships.hasMember(userId, workspaceId))) {
      return c.json({ ok: false, error: "Unauthorized" }, 401);
    }
    // An admitted member with no local projection needs synchronization, not a permission denial.
    if (!access.hasMember(userId)) {
      return c.json(
        { ok: false, error: "Workspace membership projection unavailable" },
        503,
      );
    }

    await next();
  };
}

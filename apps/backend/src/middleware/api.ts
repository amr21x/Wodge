import type { AuthInstance } from "@wodge/auth/server";
import { toUserProfile } from "@wodge/core/user/profile";
import type { MiddlewareHandler } from "hono";
import type { ApiContext } from "../types/hono-context";
export function authenticated(
  auth: AuthInstance,
): MiddlewareHandler<ApiContext> {
  return async (c, next) => {
    const session = await auth.api.getSession({
      headers: c.req.raw.headers,
    });

    if (!session) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    // getSession already returns the canonical user; mapping this DTO performs no database read.
    c.set("user", toUserProfile(session.user));
    c.set("sessionId", session.session.id);

    await next();
  };
}

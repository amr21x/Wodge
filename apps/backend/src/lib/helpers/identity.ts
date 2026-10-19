import { AuthorizationPrincipalSchema } from "@wodge/domain/authorization/validation";
import type { Context } from "hono";

/** Internal object requests have identity headers replaced by the authenticated ingress. */
export function requestIdentity(c: Context) {
  return AuthorizationPrincipalSchema.parse({
    userId: c.req.header("x-user-id"),
    sessionId: c.req.header("x-session-id"),
  });
}

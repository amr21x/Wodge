import type { MiddlewareHandler } from "hono";

import type { ActorVariables } from "../types/actor";

export const actorContext: MiddlewareHandler<{
  Variables: ActorVariables;
}> = async (c, next) => {
  c.set("actor", {
    userId: c.req.header("x-user-id") ?? "",
    isOwner: c.req.header("x-owner") === "true",
    isAdmin: c.req.header("x-admin") === "true",
    isTeamModerator: c.req.header("x-team-moderator") === "true",
    canEdit: c.req.header("x-can-edit") === "true",
    canView: c.req.header("x-can-view") === "true",
  });

  await next();
};

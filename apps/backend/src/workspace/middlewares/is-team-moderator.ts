import { Context, Next } from "hono";
import { isAdmin, isOwner, isTeamModerator } from "@wodge/data";
import WorkspaceParty from "../workspace-party";
import { unauthorized } from "../../lib/http-utils";

export async function isTeamModeratorMiddleware(
  party: WorkspaceParty,
  c: Context,
  next: Next
) {
  const userId = c.req.header("x-user-id");
  const teamId = c.req.param("teamId");

  if (!teamId) {
    return c.json({ message: "TeamId is required" }, 400);
  }

  if (
    !isTeamModerator({
      structure: party.workspaceStructure.data,
      teamId,
      userId,
    }) &&
    !isAdmin({
      members: party.workspaceMembers.data,
      userId,
    }) &&
    !isOwner({
      members: party.workspaceMembers.data,
      userId,
    })
  ) {
    return unauthorized();
  }

  return await next();
}

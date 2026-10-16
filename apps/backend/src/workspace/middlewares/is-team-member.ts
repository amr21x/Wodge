import { Context, Next } from "hono";
import { isTeamMember } from "@wodge/data";
import WorkspaceParty from "../workspace-party";
import { unauthorized } from "../../lib/http-utils";

export async function isTeamMemberMiddleware(
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
    !isTeamMember({
      structure: party.workspaceStructure.data,
      teamId,
      userId,
    })
  ) {
    return unauthorized();
  }

  return await next();
}

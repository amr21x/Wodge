import { Context, Next } from "hono";
import { canEdit, canView, isAdmin, isOwner, isTeamMember } from "@wodge/data";
import { ChannelsTypes } from "@wodge/domain/channels";
import WorkspaceParty from "../workspace-party";
import { unauthorized } from "../../lib/http-utils";

export async function canEditMiddleware(
  party: WorkspaceParty,
  c: Context,
  next: Next
) {
  const userId = c.req.header("x-user-id");
  const channelType = <ChannelsTypes>c.req.header("channelType") || "room";
  const folderId = c.req.header("folderId");

  const teamId = c.req.param("teamId");
  const channelId = c.req.param("channelId");

  console.log("called");

  if (!teamId || !channelId) {
    return c.json({ message: "TeamId is required" }, 400);
  }

  if (
    !canEdit({
      structure: party.workspaceStructure.data,
      teamId,
      userId,
      channelId,
      channelType,
      members: party.workspaceMembers.data,
      folderId,
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
    console.log("problem2");

    return unauthorized();
  }

  return await next();
}

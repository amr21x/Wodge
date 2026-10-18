import type { ChannelsTypes } from "@wodge/domain/channels/index";
import { AuthChannelResponseSchema } from "@wodge/domain/channels/index";
import type { WorkspaceGateway } from "../gateways/workspace";

export async function authorizeChannel(
  request: Request,
  workspaceGateway: WorkspaceGateway,
  userId: string,
  type: ChannelsTypes,
  channelId: string,
) {
  const url = new URL(request.url);
  const workspaceId =
    request.headers.get("x-workspace-id") ??
    url.searchParams.get("workspaceId");
  const teamId =
    request.headers.get("x-team-id") ?? url.searchParams.get("teamId");
  const folderId =
    request.headers.get("x-folder-id") ?? url.searchParams.get("folderId");

  if (!workspaceId || !teamId || (type === "page" && !folderId)) {
    return null;
  }

  const response = await workspaceGateway.channelAccess(workspaceId, {
    teamId,
    userId,
    channelId,
    type,
    folderId,
  });

  if (!response.ok) {
    return null;
  }

  const result = AuthChannelResponseSchema.safeParse(await response.json());

  if (!result.success || !result.data.success) {
    return null;
  }
  const permissions = result.data;

  request.headers.set("channel-auth", JSON.stringify(permissions));
  request.headers.set("x-admin", String(permissions.isAdmin));
  request.headers.set(
    "x-can-edit",
    String(
      permissions.canEdit ||
        permissions.isOwner ||
        permissions.isAdmin ||
        permissions.isTeamModerator,
    ),
  );
  request.headers.set(
    "x-can-view",
    String(
      permissions.canView ||
        permissions.canEdit ||
        permissions.isOwner ||
        permissions.isAdmin ||
        permissions.isTeamModerator,
    ),
  );
  request.headers.set("x-owner", String(permissions.isOwner));
  request.headers.set("x-team-moderator", String(permissions.isTeamModerator));

  return request;
}

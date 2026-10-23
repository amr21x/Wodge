import { containsPermissions } from "@wodge/auth/authorization/policy";
import type {
  AuthChannelResponse,
  ChannelsTypes,
} from "@wodge/domain/channels/index";
import type { Permissions } from "@wodge/domain/authorization/permissions";

export function authorizeWorkspaceChannel(
  permissions: Permissions,
  type: ChannelsTypes,
): AuthChannelResponse {
  if (type === "resources") return { success: false };
  const canView = containsPermissions(permissions, { [type]: ["read"] });
  const canEdit =
    type === "room"
      ? containsPermissions(permissions, { message: ["send"] })
      : containsPermissions(permissions, { [type]: ["update"] });
  return { success: canView, canView, canEdit: canView && canEdit };
}

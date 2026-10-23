import type { AuthChannelResponse } from "@wodge/domain/channels/index";

/** Apply the resolved page/thread policy capabilities consistently across HTTP and realtime. */
export function channelCapabilities(permissions: AuthChannelResponse) {
  const canEdit = Boolean(
    permissions.success &&
    (permissions.canEdit ||
      permissions.isOwner ||
      permissions.isAdmin ||
      permissions.isTeamModerator),
  );
  return {
    canEdit,
    canView: Boolean(permissions.success && (permissions.canView || canEdit)),
  };
}

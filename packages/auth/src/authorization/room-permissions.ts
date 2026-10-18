import { roomsError } from "@wodge/core/rooms/errors";
import type { ResourceActor } from "@wodge/domain/channels/index";

export const roomMutationActions = {
  sendMessage: "send",
  editMessage: "editOwn",
  deleteMessage: "deleteOwn",
  vote: "vote",
  removeVote: "vote",
} as const;

export function requireRoomPermission(
  actor: ResourceActor & { canView: boolean },
  action: (typeof roomMutationActions)[keyof typeof roomMutationActions],
) {
  if (actor.permissions) {
    const actions = actor.permissions.message ?? [];
    if (
      actions.includes(action) ||
      (action === "deleteOwn" && actions.includes("moderate"))
    ) {
      return;
    }
    throw roomsError("ROOM_FORBIDDEN", "Room action is not permitted");
  }

  // Compatibility for callers not yet migrated to resource grants. Public room
  // ingress always supplies explicit permissions through roomAuthorization.
  const privileged = actor.isAdmin || actor.isOwner || actor.isTeamModerator;
  if (
    action === "send"
      ? actor.canEdit || privileged
      : action === "vote"
        ? actor.canView || actor.canEdit || privileged
        : true
  ) {
    return;
  }
  throw roomsError("ROOM_FORBIDDEN", "Resource cannot be edited by this actor");
}

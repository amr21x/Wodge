import { useParams } from "next/navigation";
import type { Permissions } from "@wodge/domain/authorization/permissions";
import { usePermission } from "./use-permission";

export function useRoomAction(
  action: NonNullable<Permissions["message"]>[number],
  enabled = true,
) {
  const { channelId } = useParams<{ channelId?: string }>();
  return usePermission(
    enabled && channelId ? { type: "room", id: channelId } : undefined,
    { room: ["read"], message: [action] },
  );
}

import { useParams } from "next/navigation";
import type { ChannelsTypes } from "@wodge/domain/channels/index";
import type { Permissions } from "@wodge/domain/authorization/permissions";
import { usePermission } from "./use-permission";

export interface ChannelPermissionInput {
  type: ChannelsTypes;
  forceTeamId?: string;
  forceChannelId?: string;
  forceFolderId?: string;
}
export function useChannelPermission(
  input: ChannelPermissionInput,
  action: "read" | "update",
) {
  const { channelId } = useParams<{ channelId?: string }>();
  const id = input.forceChannelId ?? channelId;
  const type = input.type;
  const permissions: Permissions =
    type === "room"
      ? action === "read"
        ? { room: ["read"] }
        : { room: ["read"], message: ["send"] }
      : type === "resources"
        ? {}
        : { [type]: [action] };
  return usePermission(
    id && type !== "resources" ? { type, id } : undefined,
    permissions,
  );
}

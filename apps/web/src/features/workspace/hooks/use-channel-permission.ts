import { api } from "@/client/api";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import type { ChannelsTypes } from "@wodge/domain/channels/index";
import type { Permissions } from "@wodge/domain/authorization/permissions";
import { useCurrentWorkspace } from "../state/workspace-provider";
import { useCurrentUser } from "../../account/hooks/use-current-user";

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
  const { workspaceId } = useCurrentWorkspace();
  const { user } = useCurrentUser();
  const { channelId } = useParams<{ channelId?: string }>();
  const id = input.forceChannelId ?? channelId;
  const type = input.type;
  const { data } = useQuery({
    queryKey: ["permission", workspaceId, user?.id, type, id, action],
    enabled: !!workspaceId && !!id && !!user && type !== "resources",
    staleTime: 0,
    refetchInterval: 10_000,
    queryFn: async () => {
      if (!workspaceId || !id || type === "resources") return false;
      const permissions: Permissions =
        type === "room"
          ? action === "read"
            ? { room: ["read"] }
            : { room: ["read"], message: ["send"] }
          : { [type]: [action] };
      const response = await api.api.workspaces[
        ":workspaceId"
      ].authorization.check.$post({
        param: { workspaceId },
        json: { scope: { type, id }, permissions },
      });
      if (!response.ok) return false;
      return (await response.json()).success;
    },
  });
  return data === true;
}

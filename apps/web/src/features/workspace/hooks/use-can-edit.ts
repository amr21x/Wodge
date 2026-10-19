import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import { canEdit } from "@wodge/auth/authorization/access";
import { ChannelsTypes } from "@wodge/domain/channels/index";

import { useCurrentUser } from "../../account/hooks/use-current-user";
import { useIsOwnerOrAdmin } from "./use-is-owner-or-admin";
import { useCurrentWorkspace } from "@/features/workspace/state/workspace-provider";

export function useCanEdit({
  type,
  forceTeamId,
  forceChannelId,
  forceFolderId,
}: {
  type: ChannelsTypes;
  forceTeamId?: string;
  forceChannelId?: string;
  forceFolderId?: string;
}) {
  const { structure, members } = useCurrentWorkspace();

  const { teamId, channelId, folderId } = useParams<{
    teamId: string;
    channelId: string;
    folderId: string;
  }>();

  const { user } = useCurrentUser();

  const [grant, setGrant] = useState(false);

  const isAdminOrOwner = useIsOwnerOrAdmin();

  useEffect(() => {
    setGrant(
      isAdminOrOwner ||
        canEdit({
          members,
          structure,
          teamId: forceTeamId || teamId,
          channelId: forceChannelId || channelId,
          channelType: type,
          userId: user?.id,
          ...(type === "page" && { folderId: forceFolderId || folderId }),
        }),
    );
  }, [
    isAdminOrOwner,
    structure,
    teamId,
    user?.id,
    members,
    channelId,
    folderId,
    type,
    forceChannelId,
    forceFolderId,
    forceTeamId,
  ]);

  return grant;
}

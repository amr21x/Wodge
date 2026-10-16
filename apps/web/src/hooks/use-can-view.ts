import { useEffect, useState } from "react";

import { canEdit, canView } from "@wodge/data";
import { ChannelsTypes } from "@wodge/domain/channels";

import { useParams } from "next/navigation";
import { useCurrentUser } from "./use-current-user";
import { useIsOwnerOrAdmin } from "./use-is-owner-or-admin";
import { useIsTeamModerator } from "./use-is-team-moderator";
import { useCurrentWorkspace } from "@/components/workspace-provider";

export function useCanView({
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
  const isTeamMod = useIsTeamModerator(forceTeamId);

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
        }) ||
        canView({
          members,
          structure,
          teamId: forceTeamId || teamId,
          channelId: forceChannelId || channelId,
          channelType: type,
          userId: user?.id,
          ...(type === "page" && { folderId: forceFolderId || folderId }),
        }),
    );
  }, [structure, teamId, user?.id, members, channelId, folderId, type]);

  return grant;
}

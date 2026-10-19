import {
  isAdmin,
  isOwner,
  isTeamModerator,
} from "@wodge/auth/authorization/access";
import { useCurrentUser } from "../../account/hooks/use-current-user";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useCurrentWorkspace } from "@/features/workspace/state/workspace-provider";

export function useIsTeamModerator(forceTeamId?: string) {
  const { structure, members } = useCurrentWorkspace();

  const { teamId } = useParams<{
    teamId: string;
  }>();

  const { user } = useCurrentUser();

  const [grant, setGrant] = useState(false);

  useEffect(() => {
    setGrant(
      isAdmin({
        userId: user?.id,
        members,
      }) ||
        isOwner({ userId: user?.id, members }) ||
        isTeamModerator({
          structure,
          userId: user?.id,
          teamId: forceTeamId || teamId,
        }),
    );
  }, [structure, teamId, user?.id]);

  return grant;
}

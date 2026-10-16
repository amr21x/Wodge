import { isTeamMember, isTeamModerator } from "@wodge/data";
import { useCurrentUser } from "./use-current-user";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useCurrentWorkspace } from "@/components/workspace-provider";

export function useIsTeamMember(forceTeamId?: string) {
  const { structure } = useCurrentWorkspace();

  const { teamId } = useParams<{
    teamId: string;
  }>();
  const { user } = useCurrentUser();

  const [grant, setGrant] = useState(false);
  useEffect(() => {
    setGrant(
      isTeamMember({
        structure,
        teamId: forceTeamId || teamId,
        userId: user?.id,
      }) ||
        isTeamModerator({
          structure,
          userId: user?.id,
          teamId: forceTeamId || teamId,
        }),
    );
  }, [structure, teamId, user?.id]);

  return grant;
}

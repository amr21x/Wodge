import { isAdmin, isOwner } from "@wodge/auth/authorization/access";
import { useCurrentUser } from "../../account/hooks/use-current-user";
import { useEffect, useState } from "react";
import { useCurrentWorkspace } from "@/features/workspace/state/workspace-provider";

export function useIsOwnerOrAdmin() {
  const { members } = useCurrentWorkspace();

  const { user } = useCurrentUser();

  const [grant, setGrant] = useState(false);

  useEffect(() => {
    setGrant(
      isAdmin({ members, userId: user?.id }) ||
        isOwner({ members, userId: user?.id }),
    );
  }, [members, user?.id]);

  return grant;
}

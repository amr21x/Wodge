import { isAdmin, isOwner } from "@wodge/data";
import { useCurrentUser } from "./use-current-user";
import { useEffect, useState } from "react";
import { useCurrentWorkspace } from "@/components/workspace-provider";

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

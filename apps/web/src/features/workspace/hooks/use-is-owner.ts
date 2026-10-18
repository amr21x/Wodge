import { useEffect, useState } from "react";
import { useCurrentUser } from "../../account/hooks/use-current-user";
import { isOwner } from "@wodge/auth/authorization/access";
import { useCurrentWorkspace } from "@/features/workspace/state/workspace-provider";

export function useIsOwner() {
  const { members } = useCurrentWorkspace();

  const { user } = useCurrentUser();

  const [grant, setGrant] = useState(false);

  useEffect(() => {
    setGrant(isOwner({ members, userId: user?.id }));
  }, [members, user?.id]);

  return grant;
}

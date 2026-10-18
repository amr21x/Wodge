import { useMemo } from "react";
import { useMembersInfo } from "./use-members-info";

export function useMember(memberId?: string) {
  const { membersInfo, isMembersPending } = useMembersInfo();

  const member = useMemo(() => {
    if (isMembersPending) {
      return;
    }

    return membersInfo?.find((m) => m.id === memberId);
  }, [membersInfo, memberId, isMembersPending]);

  return { member, isMembersPending };
}

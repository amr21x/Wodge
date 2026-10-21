import { useQuery } from "@tanstack/react-query";
import { api } from "@/client/api";
import { requireOk } from "@/client/errors";
import type { AuthorizationScope } from "@wodge/domain/authorization/models";
import type { Permissions } from "@wodge/domain/authorization/permissions";
import { useCurrentWorkspace } from "../state/workspace-provider";
import { useCurrentUser } from "../../account/hooks/use-current-user";

export function usePermission(
  scope: AuthorizationScope | undefined,
  permissions: Permissions,
) {
  const { workspaceId } = useCurrentWorkspace();
  const { user, sessionId } = useCurrentUser();
  const query = useQuery({
    queryKey: [
      "permission",
      workspaceId,
      user?.id,
      sessionId,
      scope,
      permissions,
    ],
    enabled: !!workspaceId && !!scope && !!user,
    staleTime: 0,
    gcTime: 0,
    refetchInterval: 10_000,
    queryFn: async () => {
      if (!workspaceId || !scope || !user) return false;
      const response = await api.api.workspaces[
        ":workspaceId"
      ].authorization.check.$post({
        param: { workspaceId },
        json: { scope, permissions },
      });
      await requireOk(response);
      return (await response.json()).success;
    },
  });
  // A failed refresh is never proof of a continuing grant.
  return (
    !!user && !!scope && !!workspaceId && !query.isError && query.data === true
  );
}

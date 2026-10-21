"use client";

import { useCurrentUser } from "../../account/hooks/use-current-user";
import { api } from "@/client/api";
import { requireOk } from "@/client/errors";
import type { Workspace } from "@wodge/domain/workspace/models";
import { useQuery } from "@tanstack/react-query";
import { usePathname } from "next/navigation";

export function useUserWorkspaces() {
  const { user } = useCurrentUser();
  const pathname = usePathname();

  const { data, isPending, isError } = useQuery({
    queryKey: ["user-workspaces", user?.id],
    queryFn: async () => {
      const res = await api.api.users.workspaces.$get();
      await requireOk(res);

      const data = (await res.json()).map((workspace) => ({
        ...workspace,
        createdAt: new Date(workspace.createdAt),
      })) satisfies Workspace[];

      return data;
    },

    enabled: !!user?.id && pathname !== "/demo" && pathname !== "/login",
  });

  if (isError) {
    console.error("Failed to fetch workspaces data");
  }

  return {
    userWorkspaces: user ? data : undefined,
    isUserWorkspacesPending: isPending,
  };
}

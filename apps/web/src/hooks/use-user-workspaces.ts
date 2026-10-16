"use client";

import { useCurrentUser } from "./use-current-user";
import { Workspace } from "@wodge/data";
import { useQuery } from "@tanstack/react-query";
import { usePathname } from "next/navigation";

export function useUserWorkspaces() {
  const { user } = useCurrentUser();
  const pathname = usePathname();

  const { data, isPending, isError } = useQuery({
    queryKey: ["user-workspaces"],
    queryFn: async () => {
      const res = await fetch(`/api/users/workspaces`);

      if (!res.ok) throw new Error("Failed to fetch workspaces data");

      const data = (await res.json()) as Workspace[];

      return data;
    },

    enabled: !!user?.id && pathname !== "/demo" && pathname !== "/login",
  });

  if (isError) {
    console.error("Failed to fetch workspaces data");
  }

  return { userWorkspaces: data, isUserWorkspacesPending: isPending };
}

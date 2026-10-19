"use client";

import { api } from "@/client/api";
import { authClient } from "@/features/auth/client";

import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

import type { UserType } from "@wodge/domain/user/models";
import { usePathname } from "next/navigation";

import { createUserRep } from "@/client/state/create-user-rep";
import { useAppStore } from "@/client/state/store";

export function useCurrentUser() {
  const { data: session } = authClient.useSession();
  const { connectSocket } = useAppStore((s) => s.actions);

  const pathname = usePathname();
  const { data, isPending, isError } = useQuery({
    queryKey: ["user", session?.user.id],
    queryFn: async () => {
      const response = await api.api.users.me.$get();

      if (!response.ok) {
        throw new Error("Network response was not ok");
      }

      const data = await response.json();
      return {
        ...data,
        createdAt: new Date(data.createdAt),
        updatedAt: new Date(data.updatedAt),
      } satisfies UserType;
    },
    enabled: !!session && pathname !== "/demo" && pathname !== "/login",
  });

  // if (!isPending && !data) throw Error("Error loading user");

  if (isError) {
    throw Error("Error loading user");
  }

  useEffect(() => {
    if (!isPending && data) {
      if (!useAppStore.getState().userStore) {
        createUserRep(data?.id);
      }

      if (!useAppStore.getState().socket && data.id) {
        connectSocket(data?.id);
      }
    }
  }, [data, isPending, connectSocket]);

  return { user: data, isUserPending: isPending };
}

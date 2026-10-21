"use client";

import { requireOk } from "@/client/errors";
import { api } from "@/client/api";
import { authClient } from "@/features/auth/client";

import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

import type { UserType } from "@wodge/domain/user/models";
import { usePathname } from "next/navigation";

import { createUserRep } from "@/client/state/create-user-rep";
import { useAppStore } from "@/client/state/store";

export function useCurrentUser() {
  const { data: session, isPending: isSessionPending } =
    authClient.useSession();
  const { connectSocket } = useAppStore((s) => s.actions);

  const pathname = usePathname();
  const { data, isPending, isError } = useQuery({
    queryKey: ["user", session?.user.id, session?.session?.id],
    queryFn: async () => {
      const response = await api.api.users.me.$get();

      await requireOk(response);

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

  useEffect(() => {
    if (!isPending && data) {
      if (session && !useAppStore.getState().userStore) {
        createUserRep(data?.id);
      }

      if (session && !useAppStore.getState().socket && data.id) {
        connectSocket(data?.id);
      }
    }
  }, [data, isPending, connectSocket, session]);

  if (isError) throw Error("Error loading user");

  return {
    user: session ? data : undefined,
    sessionId: session?.session?.id,
    isUserPending: isSessionPending || (!!session && isPending),
  };
}

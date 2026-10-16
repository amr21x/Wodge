"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { PublicUserType, users } from "@wodge/data";
import { usePathname } from "next/navigation";

import { createUserRep } from "@/store/create-user-rep";
import { useAppStore } from "@/store/store";

type Session = {
  sessionToken: string;
  userId: string;
  expires: string;
  user: PublicUserType;
};

export function useCurrentUser() {
  const { connectSocket } = useAppStore((s) => s.actions);

  const pathname = usePathname();
  const { data, isPending, isError } = useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      const response = await fetch("/auth/user");

      if (!response.ok) {
        throw new Error("Network response was not ok");
      }

      const data = (await response.json()) as typeof users.$inferSelect;
      return data;
    },
    enabled: pathname !== "/demo" && pathname !== "/login",
  });

  // if (!isPending && !data) throw Error("Error loading user");
  if (isError) throw Error("Error loading user");

  useEffect(() => {
    if (!isPending && data) {
      if (!useAppStore.getState().userStore) createUserRep(data?.id);
      if (!useAppStore.getState().socket && data.id) connectSocket(data?.id);
    }
  }, [data, isPending]);

  return { user: data, isUserPending: isPending };
}

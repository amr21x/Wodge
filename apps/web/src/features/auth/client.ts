"use client";

import { authClient } from "@wodge/auth/client";
import { useAppStore } from "@/client/state/store";
import { queryClient } from "@/client/query";

export { authClient };

export async function signOut() {
  const result = await authClient.signOut();

  if (!result.error) {
    await queryClient.cancelQueries();
    queryClient.clear();
    await useAppStore.getState().actions.reset();
    localStorage.removeItem("REACT_QUERY_OFFLINE_CACHE");
    window.location.assign("/login");
  }

  return result;
}

"use client";

import { authClient } from "@wodge/auth/client";
import { queryClient } from "@/client/query";

export { authClient };

export async function signOut() {
  const result = await authClient.signOut();

  if (!result.error) {
    queryClient.clear();
    localStorage.removeItem("REACT_QUERY_OFFLINE_CACHE");
    window.location.assign("/login");
  }

  return result;
}

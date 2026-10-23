"use client";

import { RequestFailure } from "../errors";
import { QueryClient } from "@tanstack/react-query";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";

export const queryClient = new QueryClient({
  defaultOptions: {
    mutations: { retry: false },
    queries: {
      staleTime: Infinity,
      gcTime: Infinity,
      retry: (count, error) =>
        !(
          error instanceof RequestFailure &&
          [400, 401, 403, 404, 429, 503].includes(error.status)
        ) && count < 2,
    },
  },
});

export const localStoragePersister = createSyncStoragePersister({
  storage: typeof window !== "undefined" ? window.localStorage : undefined,
});

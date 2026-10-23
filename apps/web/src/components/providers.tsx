"use client";

import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { localStoragePersister, queryClient } from "@/client/query";
import { WorkspaceProvider } from "@/features/workspace/state/workspace-provider";
import { LayoutContextProvider } from "@livekit/components-react";
import { createStore, Provider } from "jotai";

import { SessionRecovery } from "@/features/auth/components/session-recovery";
import { FeatureFlagsProvider } from "./feature-flags-provider";

const jotaiStore = createStore();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={jotaiStore}>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister: localStoragePersister,
          maxAge: Infinity,
          // Protected query snapshots must never outlive their verified session.
          buster: "session-scoped-cache",
          dehydrateOptions: {
            shouldDehydrateQuery: (query) =>
              query.queryKey[0] === "feature-flags",
          },
        }}
      >
        <SessionRecovery />
        <LayoutContextProvider>
          <FeatureFlagsProvider>
            <WorkspaceProvider>{children}</WorkspaceProvider>
          </FeatureFlagsProvider>
        </LayoutContextProvider>
        <ReactQueryDevtools
          initialIsOpen={false}
          buttonPosition="bottom-right"
        />
      </PersistQueryClientProvider>
    </Provider>
  );
}

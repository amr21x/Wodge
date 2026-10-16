"use client";

import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import {
  localStoragePersister,
  queryClient,
} from "@wodge/data/lib/query-client";
import { WorkspaceProvider } from "@/components/workspace-provider";
import { LayoutContextProvider } from "@livekit/components-react";
import { createStore, Provider } from "jotai";

export const jotaiStore = createStore();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={jotaiStore}>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister: localStoragePersister,
          maxAge: Infinity,
        }}
      >
        <LayoutContextProvider>
          <WorkspaceProvider>{children}</WorkspaceProvider>
        </LayoutContextProvider>
        <ReactQueryDevtools
          initialIsOpen={false}
          buttonPosition="bottom-right"
        />
      </PersistQueryClientProvider>
    </Provider>
  );
}

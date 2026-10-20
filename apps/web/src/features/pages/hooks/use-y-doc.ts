import { api } from "@/client/api";
import { env } from "@wodge/env/client";
import { useEffect, useState } from "react";
import YProvider from "y-partyserver/provider";
import * as Y from "yjs";
import { IndexeddbPersistence } from "y-indexeddb";

interface YDocProps {
  channelId: string;
  folderId: string;
  teamId: string;
  workspaceId: string;
}

interface PageCollaboration {
  key: string;
  provider: YProvider;
  idbProvider: IndexeddbPersistence;
}

export function useYDoc({
  channelId,
  folderId,
  teamId,
  workspaceId,
}: YDocProps) {
  const key = JSON.stringify([workspaceId, teamId, folderId, channelId]);
  const [collaboration, setCollaboration] = useState<PageCollaboration | null>(
    null,
  );

  useEffect(() => {
    const document = new Y.Doc();
    // Retain the existing IndexedDB name so offline documents remain available.
    const idbProvider = new IndexeddbPersistence(channelId, document);
    const provider = new YProvider(
      env.NEXT_PUBLIC_BACKEND_DOMAIN,
      channelId,
      document,
      {
        party: "page",
        connect: false,
        params: async () => {
          const response = await api.api.users.token.$get();
          if (!response.ok)
            throw new Error("Page collaboration authentication failed");
          return {
            folderId,
            teamId,
            workspaceId,
            token: (await response.json()).token,
          };
        },
      },
    );
    setCollaboration({ key, provider, idbProvider });
    provider.connect();
    return () => {
      provider.destroy();
      void idbProvider.destroy();
      document.destroy();
    };
  }, [key, channelId, folderId, teamId, workspaceId]);

  return collaboration?.key === key ? collaboration : null;
}

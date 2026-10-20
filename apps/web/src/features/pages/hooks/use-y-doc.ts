import {
  failureMessage,
  requireOk,
  reportAccessFailure,
} from "@/client/errors";
import { refreshPermissions } from "@/client/permissions";
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
  userId?: string;
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
  userId,
}: YDocProps) {
  const key = JSON.stringify([
    userId,
    workspaceId,
    teamId,
    folderId,
    channelId,
  ]);
  const [collaboration, setCollaboration] = useState<PageCollaboration | null>(
    null,
  );

  const [connectionMessage, setConnectionMessage] = useState(
    "Connecting. Pending edits have not been confirmed by the server.",
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
          try {
            await requireOk(response);
          } catch (error) {
            setConnectionMessage(failureMessage(error));
            throw error;
          }
          return {
            folderId,
            teamId,
            workspaceId,
            token: (await response.json()).token,
          };
        },
      },
    );
    const onClose = (event: CloseEvent) => {
      refreshPermissions({ refetch: false });
      if (event.code === 1008) reportAccessFailure(403);
      setConnectionMessage(
        event.code === 1008
          ? "Page access was lost. Pending edits have not been confirmed."
          : "Collaboration disconnected. Pending edits have not been confirmed; reconnecting when available.",
      );
    };
    const onSync = (synced: boolean) => {
      setConnectionMessage(
        synced
          ? ""
          : "Synchronizing. Pending edits have not been confirmed by the server.",
      );
    };
    const onStatus = ({ status }: { status: string }) => {
      if (status === "connected") refreshPermissions();
    };
    provider.on("connection-close", onClose);
    provider.on("sync", onSync);
    provider.on("status", onStatus);
    setCollaboration({ key, provider, idbProvider });
    provider.connect();
    return () => {
      provider.off("connection-close", onClose);
      provider.off("sync", onSync);
      provider.off("status", onStatus);
      provider.destroy();
      void idbProvider.destroy();
      document.destroy();
    };
  }, [key, channelId, folderId, teamId, workspaceId, userId]);

  return collaboration?.key === key
    ? { ...collaboration, connectionMessage }
    : null;
}

import { env } from "@wodge/env";
import useYProvider from "y-partykit/react";

import * as Y from "yjs";
import { IndexeddbPersistence } from "y-indexeddb";
import { editorUsersAtoms } from "@/components/editor/block-editor/atoms";
import { useSetAtom } from "jotai";
import { set } from "lodash";
import { CloseEvent } from "partysocket/ws";
import { useEffect } from "react";

interface YDocProps {
  channelId: string;
  folderId: string;
  teamId: string;
  workspaceId: string;
}

export function useYDoc({
  channelId,
  folderId,
  teamId,
  workspaceId,
}: YDocProps) {
  const setDisplayUsers = useSetAtom(editorUsersAtoms);
  const yDoc = new Y.Doc();
  const idbProvider = new IndexeddbPersistence(channelId, yDoc);

  const provider = useYProvider({
    room: channelId,
    host: env.NEXT_PUBLIC_BACKEND_DOMAIN,
    party: "page",
    doc: idbProvider.doc,
    options: {
      params: async () => ({
        folderId,
        teamId,
        workspaceId,
        token: await (async () => {
          const res = await fetch(`/api/users/token`);

          if (!res.ok) return "";

          const data = await res.json<{ token: string }>();

          return data.token;
        })(),
      }),
    },
  });

  return { provider, idbProvider };
}

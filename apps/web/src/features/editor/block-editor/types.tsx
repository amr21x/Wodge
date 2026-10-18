import * as Y from "yjs";
import YPartyKitProvider from "y-partyserver/provider";

export interface TiptapProps {
  ydoc: Y.Doc;
  provider: YPartyKitProvider;
}

export type EditorUser = {
  clientId: string;
  userId: string;
  username: string;
  displayName: string;
  color: string;
  avatar?: string;
  initials?: string;
};

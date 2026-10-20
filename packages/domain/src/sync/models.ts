export interface SyncClientGroup {
  id: string;
  userID: string;
  clientVersion?: number;
}
export interface SyncClient {
  id: string;
  clientGroupID: string;
  lastMutationID: number;
  lastModifiedVersion: number;
}

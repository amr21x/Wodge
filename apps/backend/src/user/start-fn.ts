import { makeWorkspacesStoreKey, REPLICACHE_VERSIONS_KEY } from "@wodge/data";
import UserParty from "./user-party";
import { Versions } from "../types";

export async function startFn(party: UserParty) {
  const map = await party.room.storage.get([
    REPLICACHE_VERSIONS_KEY,
    makeWorkspacesStoreKey(),
  ]);

  party.versions =
    <Versions>map.get(REPLICACHE_VERSIONS_KEY) ||
    new Map<string, number | boolean>([["globalVersion", 0]]);

  party.workspacesStore =
    <Set<string>>map.get(makeWorkspacesStoreKey()) || new Set<string>();
}

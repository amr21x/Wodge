import { REPLICACHE_VERSIONS_KEY } from "@wodge/data";
import { Versions } from "../types";
import RoomParty from "./room-party";

export async function startFn(party: RoomParty) {
  party.messages = (await party.room.storage.get("messages")) || {
    data: [],
    lastModifiedVersion: 0,
    deleted: false,
  };

  party.versions = <Versions>(
    ((await party.room.storage.get(REPLICACHE_VERSIONS_KEY)) ||
      new Map<string, number | boolean>([["globalVersion", 0]]))
  );
}

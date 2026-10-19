import { PatchOperation } from "replicache";
import { PatcherParams } from "../replicache";

import RoomServer from "../../../servers/room";

export function createRoomPatch(party: RoomServer, userId: string) {
  return async function ({ fromVersion }: PatcherParams) {
    const patch: PatchOperation[] = [];

    if (party.messages.lastModifiedVersion > fromVersion) {
      patch.push({
        op: "put",
        key: "messages",
        value: party.messages.data,
      });
    }

    return patch;
  };
}

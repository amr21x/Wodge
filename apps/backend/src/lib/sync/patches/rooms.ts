import type { FlagSnapshot } from "@wodge/domain/features/models";
import { PatchOperation } from "replicache";
import { PatcherParams } from "../replicache";

import RoomServer from "../../../servers/room";

export function createRoomPatch(
  party: RoomServer,
  userId: string,
  readFlags: () => Promise<FlagSnapshot>,
) {
  return async function (_input: PatcherParams) {
    const patch: PatchOperation[] = [];

    const { flags } = await readFlags();
    // Flag-only edits must replace the client view without modifying persisted records.
    {
      patch.push({
        op: "put",
        key: "messages",
        value: party.messages.data.filter(
          (item) =>
            (flags.polls || item.type !== "poll") &&
            (flags.attachments ||
              !["image", "audio", "video", "file"].includes(item.type)),
        ),
      });
    }

    return patch;
  };
}

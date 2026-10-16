import { RunnerParams } from "../lib/replicache";
import RoomParty from "./room-party";
import { Message } from "@wodge/data";
import { produce } from "immer";
import { deleteMessageMutation } from "@wodge/data/models/room/mutators/delete-msg";

export async function deleteMessage(
  party: RoomParty,
  params: RunnerParams,
  isPrivileged: boolean
) {
  const d = deleteMessageMutation({
    userId: params.userId,
    msg: params.mutation.args as Message,
    arr: party.messages.data,
    isPrivileged,
  });

  party.messages = produce(party.messages, (draft) => {
    draft.data = d;
    draft.lastModifiedVersion = params.nextVersion;
  });

  await party.room.storage.put("messages", party.messages);
}

import { sendMessageMutation } from "@wodge/data/models/room/mutators/send-msg";
import { RunnerParams } from "../lib/replicache";
import RoomParty from "./room-party";
import { Message } from "@wodge/data";
import { produce } from "immer";

export async function sendMessage(party: RoomParty, params: RunnerParams) {
  const d = sendMessageMutation({
    curUserId: params.userId,
    message: params.mutation.args as Message,
    arr: party.messages.data,
  });

  party.messages = produce(party.messages, (draft) => {
    draft.data = d;
    draft.lastModifiedVersion = params.nextVersion;
  });

  await party.room.storage.put("messages", party.messages);
}

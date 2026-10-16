import { sendMessageMutation } from "@wodge/data/models/room/mutators/send-msg";
import { RunnerParams } from "../lib/replicache";
import RoomParty from "./room-party";
import { EditMessageProps, Message } from "@wodge/data";
import { produce } from "immer";
import { editMessageMutation } from "@wodge/data/models/room/mutators/edit-msg";

export async function editMessage(party: RoomParty, params: RunnerParams) {
  const args = params.mutation.args as EditMessageProps;
  const d = editMessageMutation({
    curUserId: params.userId,
    message: args.message,
    newContent: args.newContent,
    arr: party.messages.data,
  });

  party.messages = produce(party.messages, (draft) => {
    draft.data = d;
    draft.lastModifiedVersion = params.nextVersion;
  });

  await party.room.storage.put("messages", party.messages);
}

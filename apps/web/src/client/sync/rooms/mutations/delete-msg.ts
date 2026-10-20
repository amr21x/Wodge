import { roomsError } from "./errors";
import { Message } from "@wodge/domain/rooms/models";
import { DrObj } from "@wodge/domain/types";
import { produce } from "immer";

interface deleteMsgArgs {
  // message: Message;
  // senderId: string;
  msg: Message;
  // teamId: string;
  // roomId: string;
  arr: Message[] | DrObj<Message[]>;
  userId: string;
  isPrivileged: boolean;
}

export function deleteMessageMutation({
  msg,
  arr,
  isPrivileged,
  userId,
}: deleteMsgArgs) {
  const stored = arr.find((message) => message.id === msg.id);

  if (!isPrivileged && (stored?.sender ?? msg.sender) !== userId) {
    throw roomsError(
      "ROOM_FORBIDDEN",
      "You are not allowed to delete this message",
    );
  }

  const newArr = produce(arr, (draft) => {
    return draft.filter((m) => m.id !== msg.id);
  });

  return newArr as Message[];
}

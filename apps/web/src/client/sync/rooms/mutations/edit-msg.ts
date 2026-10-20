import { roomsError } from "./errors";
import { Message } from "@wodge/domain/rooms/models";
import { MessageSchema } from "@wodge/domain/rooms/validation";
import { DrObj } from "@wodge/domain/types";
import { produce } from "immer";

interface sendMsgArgs {
  message: Message;
  curUserId: string;
  arr: Message[] | DrObj<Message[]>;
  newContent: string;
}

export function editMessageMutation({
  message,
  curUserId,
  arr,
  newContent,
}: sendMsgArgs) {
  const validateFields = MessageSchema.pick({
    content: true,
  }).safeParse({
    content: newContent,
  });

  if (!validateFields.success) {
    throw roomsError("ROOM_INVALID_INPUT", "Invalid message data");
  }

  const msgIdx = arr.findIndex((m) => m.id === message.id);

  if (msgIdx === -1) {
    throw roomsError("ROOM_NOT_FOUND", "Message not found");
  }

  if (arr[msgIdx]!.sender !== curUserId) {
    throw roomsError("ROOM_FORBIDDEN", "Invalid authorId");
  }

  const newArr = produce(arr, (draft) => {
    draft[msgIdx]!.content = newContent;
  });

  return newArr as Message[];
}

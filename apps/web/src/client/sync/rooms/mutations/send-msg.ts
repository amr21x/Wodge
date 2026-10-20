import { roomsError } from "./errors";
import { Message } from "@wodge/domain/rooms/models";
import { MessageSchema } from "@wodge/domain/rooms/validation";
import { DrObj } from "@wodge/domain/types";
import { produce } from "immer";

interface sendMsgArgs {
  message: Message;
  curUserId: string;
  // teamId: string;
  // roomId: string;
  arr: Message[] | DrObj<Message[]>;
  // structure: WorkspaceStructure | DrObj<WorkspaceStructure>;
}

export function sendMessageMutation({ message, curUserId, arr }: sendMsgArgs) {
  const validateFields = MessageSchema.safeParse(message);

  if (!validateFields.success) {
    throw roomsError("ROOM_INVALID_INPUT", "Invalid message data");
  }

  const { data: newMessage } = validateFields;

  if (newMessage.sender !== curUserId) {
    throw roomsError("ROOM_FORBIDDEN", "Invalid authorId");
  }

  if (arr.some((msg) => msg.id === newMessage.id)) {
    throw roomsError("ROOM_CONFLICT", "Message already exists");
  }

  // const newStructure = produce(structure, (draft) => {
  //   arr.push(newMessage);
  // });

  const newArr = produce(arr, (draft) => {
    draft.push({
      ...newMessage,
      date: new Date().toISOString(),
      ...(newMessage.type === "poll" && {
        votes: Array.from({ length: newMessage.pollOptions.length }, () => 0),
      }),
    });
  });

  return newArr as Message[];
}

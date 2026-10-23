import { roomsError } from "./errors";
import { Message } from "@wodge/domain/rooms/models";
import { DrObj } from "@wodge/domain/types";
import { produce } from "immer";

interface VoteArgs {
  msgId: string;
  option: number;
  msgsArr: Message[] | DrObj<Message[]>;
  curUserId: string;
}

export function voteMutation({ option, curUserId, msgId, msgsArr }: VoteArgs) {
  const newArr = produce(msgsArr, (draft) => {
    const msg = draft.find((m) => m.id === msgId);
    // Check if team not found

    if (!msg) {
      throw roomsError("ROOM_NOT_FOUND", "Messages not found");
    }

    const curVote = msg.pollVoters?.find((v) => v.voter === curUserId);

    if (curVote) {
      throw roomsError("ROOM_CONFLICT", "User already voted");
    }

    if (msg.pollOptions && option >= msg.pollOptions?.length) {
      throw roomsError("ROOM_INVALID_INPUT", "Invalid option");
    }

    msg.pollVoters?.push({ voter: curUserId, option });
    if (msg.votes![option]) {
      msg.votes![option]!++;
    } else {
      msg.votes![option] = 1;
    }
  });

  return newArr as Message[];
}

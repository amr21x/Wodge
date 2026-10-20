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

export function removeRoomVoteMutation({
  msgId,
  msgsArr,
  option,
  curUserId,
}: VoteArgs) {
  const newArr = produce(msgsArr, (draft) => {
    const msg = draft.find((m) => m.id === msgId);
    // Check if team not found

    if (!msg) {
      throw roomsError("ROOM_NOT_FOUND", "Message not found");
    }

    const curVote = msg.pollVoters?.find((v) => v.voter === curUserId);

    if (!curVote) {
      return draft;
    }

    if (msg.pollOptions && option >= msg.pollOptions?.length) {
      throw roomsError("ROOM_INVALID_INPUT", "Invalid option");
    }

    msg.pollVoters = msg.pollVoters?.filter((v) => v.voter !== curUserId);
    msg.votes![curVote.option]!--;
  });

  return newArr as Message[];
}

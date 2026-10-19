import type { EditMessageProps, VoteArgs } from "@wodge/domain/rooms/dto";
import { WriteTransaction } from "replicache";
import { sendMessageMutation } from "@wodge/core/rooms/mutations/send-msg";
import { Message } from "@wodge/domain/rooms/models";
import { deleteMessageMutation } from "@wodge/core/rooms/mutations/delete-msg";
import { editMessageMutation } from "@wodge/core/rooms/mutations/edit-msg";
import { voteMutation } from "@wodge/core/rooms/mutations/vote";
import { removeRoomVoteMutation } from "@wodge/core/rooms/mutations/remove-vote";

export type RoomMutators = ReturnType<typeof createRoomMutators>;

/** Keep optimistic identity tied to this replica, independent of profile cache timing. */
export function createRoomMutators(userId: string) {
  return {
    async sendMessage(tx: WriteTransaction, data: Message) {
      const messages = (await tx.get<Message[]>("messages")) || [];

      const newMessages = sendMessageMutation({
        arr: messages,
        message: data,
        curUserId: userId,
      });

      await tx.set("messages", newMessages);
    },
    async deleteMessage(tx: WriteTransaction, data: Message) {
      const messages = (await tx.get<Message[]>("messages")) || [];

      const newMessages = deleteMessageMutation({
        arr: messages,
        msg: data,
        userId,
        isPrivileged: true,
      });

      await tx.set("messages", newMessages);
    },

    async editMessage(tx: WriteTransaction, data: EditMessageProps) {
      const messages = (await tx.get<Message[]>("messages")) || [];

      const newMessages = editMessageMutation({
        arr: messages,
        message: data.message,
        newContent: data.newContent,
        curUserId: userId,
      });

      await tx.set("messages", newMessages);
    },
    async vote(tx: WriteTransaction, data: VoteArgs) {
      const msgs = await tx.get<Message[]>("messages");

      const newStructure = voteMutation({
        ...data,
        msgsArr: msgs as Message[],
        msgId: data.msgId,
        curUserId: userId,
      });

      await tx.set("messages", newStructure);
    },
    async removeVote(tx: WriteTransaction, data: VoteArgs) {
      const msgs = await tx.get<Message[]>("messages");

      const newStructure = removeRoomVoteMutation({
        ...data,
        msgsArr: msgs as Message[],
        msgId: data.msgId,
        curUserId: userId,
      });

      await tx.set("messages", newStructure);
    },
  };
}

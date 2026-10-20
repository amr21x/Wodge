import { RoomRepository } from "@wodge/core/rooms/repositories/messages";
import { roomsError } from "@wodge/core/rooms/errors";
import { MessageSchema } from "@wodge/domain/rooms/validation";
import type { ResourceActor } from "@wodge/domain/channels/index";
import type { RoomInputs } from "@wodge/domain/rooms/dto";
import { inject, injectable } from "tsyringe";

@injectable()
export class RoomService {
  constructor(
    @inject(RoomRepository) private readonly rooms: Pick<
      RoomRepository,
      keyof RoomRepository
    >,
  ) {}
  async sendMessage(
    input: RoomInputs["sendMessage"],
    actor: ResourceActor,
    revision?: number,
  ) {
    const message = MessageSchema.parse(input);
    if (message.sender !== actor.userId)
      throw roomsError("ROOM_FORBIDDEN", "Invalid authorId");
    return this.rooms.change(revision, () => {
      if (this.rooms.find(message.id))
        throw roomsError("ROOM_CONFLICT", "Message already exists");
      this.rooms.insert({
        ...message,
        date: new Date().toISOString(),
        ...(message.type === "poll" && {
          votes: message.pollOptions.map(() => 0),
        }),
      });
    });
  }
  async deleteMessage(
    input: RoomInputs["deleteMessage"],
    actor: ResourceActor,
    revision?: number,
  ) {
    return this.rooms.change(revision, () => {
      const stored = this.rooms.find(input.id);
      const privileged = actor.permissions
        ? !!actor.permissions.message?.includes("moderate")
        : actor.isAdmin || actor.isOwner || actor.isTeamModerator;
      if (!privileged && (stored?.sender ?? input.sender) !== actor.userId)
        throw roomsError(
          "ROOM_FORBIDDEN",
          "You are not allowed to delete this message",
        );
      this.rooms.delete(input.id);
    });
  }
  async editMessage(
    input: RoomInputs["editMessage"],
    actor: ResourceActor,
    revision?: number,
  ) {
    return this.rooms.change(revision, () => {
      const stored = this.rooms.find(input.message.id);
      if (!stored) throw roomsError("ROOM_NOT_FOUND", "Message not found");
      if (stored.sender !== actor.userId)
        throw roomsError("ROOM_FORBIDDEN", "Invalid authorId");
      this.rooms.updateContent(stored.id, input.newContent);
    });
  }
  async vote(
    input: RoomInputs["vote"],
    actor: ResourceActor,
    revision?: number,
  ) {
    return this.rooms.change(revision, () => {
      const stored = this.rooms.find(input.msgId);
      if (!stored) throw roomsError("ROOM_NOT_FOUND", "Messages not found");
      if (stored.pollVoters.some((v) => v.voter === actor.userId))
        throw roomsError("ROOM_CONFLICT", "User already voted");
      if (input.option < 0 || input.option >= stored.pollOptions.length)
        throw roomsError("ROOM_INVALID_INPUT", "Invalid option");
      this.rooms.castVote(stored.id, actor.userId, input.option);
    });
  }
  async removeVote(
    input: RoomInputs["removeVote"],
    actor: ResourceActor,
    revision?: number,
  ) {
    return this.rooms.change(revision, () => {
      const stored = this.rooms.find(input.msgId);
      if (!stored) throw roomsError("ROOM_NOT_FOUND", "Message not found");
      const vote = stored.pollVoters.find((v) => v.voter === actor.userId);
      if (!vote) return;
      if (input.option < 0 || input.option >= stored.pollOptions.length)
        throw roomsError("ROOM_INVALID_INPUT", "Invalid option");
      this.rooms.removeVote(stored.id, actor.userId, vote.option);
    });
  }
}

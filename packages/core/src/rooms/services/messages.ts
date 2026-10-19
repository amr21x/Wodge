import { deleteMessageMutation } from "@wodge/core/rooms/mutations/delete-msg";
import { editMessageMutation } from "@wodge/core/rooms/mutations/edit-msg";
import { removeRoomVoteMutation } from "@wodge/core/rooms/mutations/remove-vote";
import { sendMessageMutation } from "@wodge/core/rooms/mutations/send-msg";
import { voteMutation } from "@wodge/core/rooms/mutations/vote";
import { RoomRepository } from "@wodge/core/rooms/repositories/messages";
import type { ResourceActor } from "@wodge/domain/channels/index";
import type { RoomInputs } from "@wodge/domain/rooms/dto";
import { inject, injectable } from "tsyringe";

// Handlers authorize operations; this service applies message rules and persists changes.
@injectable()
export class RoomService {
  constructor(
    @inject(RoomRepository)
    private readonly rooms: Pick<RoomRepository, "get" | "save">,
  ) {}

  async deleteMessage(
    input: RoomInputs["deleteMessage"],
    actor: ResourceActor & { canView: boolean },
    revision?: number,
  ) {
    const data = this.rooms.get();
    const isPrivileged = actor.permissions
      ? !!actor.permissions.message?.includes("moderate")
      : actor.isAdmin || actor.isOwner || actor.isTeamModerator;
    const d = deleteMessageMutation({
      userId: actor.userId,
      msg: input,
      arr: data,
      isPrivileged,
    });

    await this.rooms.save(d, revision);
  }

  async sendMessage(
    input: RoomInputs["sendMessage"],
    actor: ResourceActor & { canView: boolean },
    revision?: number,
  ) {
    const data = this.rooms.get();

    const d = sendMessageMutation({
      curUserId: actor.userId,
      message: input,
      arr: data,
    });

    await this.rooms.save(d, revision);
  }

  async removeVote(
    input: RoomInputs["removeVote"],
    actor: ResourceActor & { canView: boolean },
    revision?: number,
  ) {
    const data = this.rooms.get();

    const vote = input;

    await this.rooms.save(
      removeRoomVoteMutation({
        curUserId: actor.userId,
        msgsArr: data,
        ...vote,
      }),
      revision,
    );
  }

  async editMessage(
    input: RoomInputs["editMessage"],
    actor: ResourceActor & { canView: boolean },
    revision?: number,
  ) {
    const data = this.rooms.get();
    const args = input;
    const d = editMessageMutation({
      curUserId: actor.userId,
      message: args.message,
      newContent: args.newContent,
      arr: data,
    });

    await this.rooms.save(d, revision);
  }

  async vote(
    input: RoomInputs["vote"],
    actor: ResourceActor & { canView: boolean },
    revision?: number,
  ) {
    const data = this.rooms.get();

    const vote = input;

    await this.rooms.save(
      voteMutation({
        curUserId: actor.userId,
        msgsArr: data,
        ...vote,
      }),
      revision,
    );
  }
}

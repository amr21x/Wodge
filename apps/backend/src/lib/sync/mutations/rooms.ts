import {
  requireRoomPermission,
  roomMutationActions,
} from "@wodge/auth/authorization/room-permissions";
import type { RoomService } from "@wodge/core/rooms/services/messages";
import type { ResourceActor } from "@wodge/domain/channels/index";
import { roomInputSchemas as schemas } from "@wodge/domain/rooms/validation";
import type { RunnerParams } from "../replicache";

export async function dispatchRoomMutation(
  service: RoomService,
  params: RunnerParams,
  actor: ResourceActor & { canView: boolean },
) {
  const name = params.mutation.name;

  if (!Object.hasOwn(schemas, name)) {
    throw new Error("Unknown mutation: " + name);
  }

  requireRoomPermission(
    actor,
    roomMutationActions[name as keyof typeof roomMutationActions],
  );

  switch (name) {
    case "deleteMessage":
      await service.deleteMessage(
        schemas.deleteMessage.parse(params.mutation.args),
        actor,
        params.nextVersion,
      );
      break;
    case "sendMessage":
      await service.sendMessage(
        schemas.sendMessage.parse(params.mutation.args),
        actor,
        params.nextVersion,
      );
      break;
    case "removeVote":
      await service.removeVote(
        schemas.removeVote.parse(params.mutation.args),
        actor,
        params.nextVersion,
      );
      break;
    case "editMessage":
      await service.editMessage(
        schemas.editMessage.parse(params.mutation.args),
        actor,
        params.nextVersion,
      );
      break;
    case "vote":
      await service.vote(
        schemas.vote.parse(params.mutation.args),
        actor,
        params.nextVersion,
      );
      break;
    default:
      throw new Error("Unsupported mutation: " + name);
  }
}

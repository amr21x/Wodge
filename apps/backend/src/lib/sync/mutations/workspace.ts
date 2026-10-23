import { workspaceError } from "@wodge/core/workspace/errors";
import type { WorkspaceService } from "@wodge/core/workspace/services/structure";
import type { ResourceActor } from "@wodge/domain/channels/index";
import { workspaceInputSchemas as schemas } from "@wodge/domain/workspace/validation";
import type { RunnerParams } from "../replicache";

export async function dispatchWorkspaceMutation(
  service: WorkspaceService,
  params: RunnerParams,
  actor: ResourceActor & { canView: boolean },
) {
  if (params.mutation.args == null) {
    throw new Error("Invalid workspace mutation arguments");
  }

  const name = params.mutation.name;

  if (name === "changeMemberRole" || name === "removeMember") {
    throw workspaceError(
      "WORKSPACE_INVALID_INPUT",
      "Organization membership and roles are managed through Better Auth",
    );
  }

  if (!Object.hasOwn(schemas, name)) {
    throw new Error("Unknown mutation: " + name);
  }

  try {
    switch (name) {
      case "createPage":
        await service.createPage(
          schemas.createPage.parse(params.mutation.args),
          actor,
          params.nextVersion,
        );
        break;
      case "deleteTeam":
        await service.deleteTeam(
          schemas.deleteTeam.parse(params.mutation.args),
          actor,
          params.nextVersion,
        );
        break;
      case "deleteFolder":
        await service.deleteFolder(
          schemas.deleteFolder.parse(params.mutation.args),
          actor,
          params.nextVersion,
        );
        break;
      case "updateRoom":
        await service.updateRoom(
          schemas.updateRoom.parse(params.mutation.args),
          actor,
          params.nextVersion,
        );
        break;
      case "deleteChannel":
        await service.deleteChannel(
          schemas.deleteChannel.parse(params.mutation.args),
          actor,
          params.nextVersion,
        );
        break;
      case "createTeam":
        await service.createTeam(
          schemas.createTeam.parse(params.mutation.args),
          actor,
          params.nextVersion,
        );
        break;
      case "updatePage":
        await service.updatePage(
          schemas.updatePage.parse(params.mutation.args),
          actor,
          params.nextVersion,
        );
        break;
      case "createThread":
        await service.createThread(
          schemas.createThread.parse(params.mutation.args),
          actor,
          params.nextVersion,
        );
        break;
      case "createRoom":
        await service.createRoom(
          schemas.createRoom.parse(params.mutation.args),
          actor,
          params.nextVersion,
        );
        break;
      case "updateFolder":
        await service.updateFolder(
          schemas.updateFolder.parse(params.mutation.args),
          actor,
          params.nextVersion,
        );
        break;
      case "updateTeam":
        await service.updateTeam(
          schemas.updateTeam.parse(params.mutation.args),
          actor,
          params.nextVersion,
        );
        break;
      case "updateThread":
        await service.updateThread(
          schemas.updateThread.parse(params.mutation.args),
          actor,
          params.nextVersion,
        );
        break;
      default:
        throw new Error("Unsupported mutation: " + name);
    }
  } catch {
    return;
  }
}

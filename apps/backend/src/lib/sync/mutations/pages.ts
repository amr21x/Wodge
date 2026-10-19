import type { PageService } from "@wodge/core/pages/services/page";
import type { ResourceActor } from "@wodge/domain/channels/index";
import { pageInputSchemas as schemas } from "@wodge/domain/pages/validation";
import type { RunnerParams } from "../replicache";

export async function dispatchPageMutation(
  service: PageService,
  params: RunnerParams,
  actor: ResourceActor & { canView: boolean },
) {
  if (
    !actor.isAdmin &&
    !actor.isOwner &&
    !actor.isTeamModerator &&
    !actor.canEdit
  ) {
    return;
  }

  const name = params.mutation.name;

  if (!Object.hasOwn(schemas, name)) {
    throw new Error("Unknown mutation: " + name);
  }

  switch (name) {
    case "createColumn":
      await service.createColumn(
        schemas.createColumn.parse(params.mutation.args),
        actor,
        params.nextVersion,
      );
      break;
    case "deleteColumn":
      await service.deleteColumn(
        schemas.deleteColumn.parse(params.mutation.args),
        actor,
        params.nextVersion,
      );
      break;
    case "updateColumn":
      await service.updateColumn(
        schemas.updateColumn.parse(params.mutation.args),
        actor,
        params.nextVersion,
      );
      break;
    case "createTask":
      await service.createTask(
        schemas.createTask.parse(params.mutation.args),
        actor,
        params.nextVersion,
      );
      break;
    case "editTask":
      await service.editTask(
        schemas.editTask.parse(params.mutation.args),
        actor,
        params.nextVersion,
      );
      break;
    case "deleteTask":
      await service.deleteTask(
        schemas.deleteTask.parse(params.mutation.args),
        actor,
        params.nextVersion,
      );
      break;
    case "moveColumns":
      await service.moveColumns(
        schemas.moveColumns.parse(params.mutation.args),
        actor,
        params.nextVersion,
      );
      break;
    case "moveTasks":
      await service.moveTasks(
        schemas.moveTasks.parse(params.mutation.args),
        actor,
        params.nextVersion,
      );
      break;
    default:
      throw new Error("Unsupported mutation: " + name);
  }
}

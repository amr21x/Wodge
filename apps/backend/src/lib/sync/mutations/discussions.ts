import type { DiscussionService } from "@wodge/core/discussions/services/posts";
import type { ResourceActor } from "@wodge/domain/channels/index";
import { discussionInputSchemas as schemas } from "@wodge/domain/discussions/validation";
import type { RunnerParams } from "../replicache";

export async function dispatchDiscussionMutation(
  service: DiscussionService,
  params: RunnerParams,
  actor: ResourceActor & { canView: boolean },
) {
  const name = params.mutation.name;

  if (!Object.hasOwn(schemas, name)) {
    throw new Error("Unknown mutation: " + name);
  }

  switch (name) {
    case "deletePost":
      await service.deletePost(
        schemas.deletePost.parse(params.mutation.args),
        actor,
        params.nextVersion,
      );
      break;
    case "editPost":
      await service.editPost(
        schemas.editPost.parse(params.mutation.args),
        actor,
        params.nextVersion,
      );
      break;
    case "togglePost":
      await service.togglePost(
        schemas.togglePost.parse(params.mutation.args),
        actor,
        params.nextVersion,
      );
      break;
    case "createPost":
      await service.createPost(
        schemas.createPost.parse(params.mutation.args),
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
    case "vote":
      await service.vote(
        schemas.vote.parse(params.mutation.args),
        actor,
        params.nextVersion,
      );
      break;
    case "deleteComment":
      await service.deleteComment(
        schemas.deleteComment.parse(params.mutation.args),
        actor,
        params.nextVersion,
      );
      break;
    case "createComment":
      await service.createComment(
        schemas.createComment.parse(params.mutation.args),
        actor,
        params.nextVersion,
      );
      break;
    case "editComment":
      await service.editComment(
        schemas.editComment.parse(params.mutation.args),
        actor,
        params.nextVersion,
      );
      break;
    default:
      throw new Error("Unsupported mutation: " + name);
  }
}

import { ObjectSyncRepository } from "@wodge/core/sync/repositories/state";
import { FeatureFlagService } from "@wodge/core/features/services/flags";
import { DiscussionService } from "@wodge/core/discussions/services/posts";
import { inject, injectable } from "tsyringe";
import { WorkspaceGateway } from "../../gateways/workspace";
import type ThreadServer from "../../servers/thread";
import type { RequestActor } from "../../types/actor";
import { dispatchDiscussionMutation } from "./mutations/discussions";
import { createThreadPatch } from "./patches/discussions";
import type { RunnerParams } from "./replicache";

@injectable()
export class ThreadSync {
  constructor(
    @inject(ObjectSyncRepository)
    private readonly syncRecords: ObjectSyncRepository,
    @inject(FeatureFlagService) private readonly flags: FeatureFlagService,
    @inject("thread") private readonly party: ThreadServer,
    @inject(DiscussionService) private readonly service: DiscussionService,
    @inject(WorkspaceGateway)
    private readonly workspaceGateway: WorkspaceGateway,
  ) {}
  get storage() {
    return this.syncRecords;
  }
  get versions() {
    return this.party.versions;
  }
  async run(params: RunnerParams, actor: RequestActor) {
    if (
      !actor.canEdit &&
      !actor.isOwner &&
      !actor.isAdmin &&
      !actor.isTeamModerator
    )
      return;
    await dispatchDiscussionMutation(this.service, params, actor);
  }
  patch = (userId: string) =>
    createThreadPatch(this.party, userId, this.flags.read);
  notify = (workspaceId: string) =>
    this.workspaceGateway.notifyChannel(workspaceId, this.party.name);
}

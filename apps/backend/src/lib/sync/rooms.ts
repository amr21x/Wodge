import { ObjectSyncRepository } from "@wodge/core/sync/repositories/state";
import { FeatureFlagService } from "@wodge/core/features/services/flags";
import { RoomService } from "@wodge/core/rooms/services/messages";
import { inject, injectable } from "tsyringe";
import { WorkspaceGateway } from "../../gateways/workspace";
import type RoomServer from "../../servers/room";
import type { RequestActor } from "../../types/actor";
import { dispatchRoomMutation } from "./mutations/rooms";
import { createRoomPatch } from "./patches/rooms";
import type { RunnerParams } from "./replicache";

@injectable()
export class RoomSync {
  constructor(
    @inject(ObjectSyncRepository)
    private readonly syncRecords: ObjectSyncRepository,
    @inject(FeatureFlagService) private readonly flags: FeatureFlagService,
    @inject("room") private readonly party: RoomServer,
    @inject(RoomService) private readonly service: RoomService,
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
    await dispatchRoomMutation(this.service, params, actor);
  }
  patch = (userId: string) =>
    createRoomPatch(this.party, userId, this.flags.read);
  notify = (workspaceId: string) =>
    this.workspaceGateway.notifyChannel(workspaceId, this.party.name);
}

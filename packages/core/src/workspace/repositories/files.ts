import { ObjectSyncRepository } from "@wodge/core/sync/repositories/state";
import type { WorkspacePartyInterface } from "@wodge/domain/sync/state";
import { inject, injectable } from "tsyringe";

@injectable()
export class WorkspaceFileRepository {
  constructor(
    @inject(ObjectSyncRepository)
    private readonly sync: ObjectSyncRepository,
    @inject("workspace") private readonly state: WorkspacePartyInterface,
  ) {}

  async saveChange() {
    const revision = this.state.versions.get("globalVersion")! + 1;

    this.state.versions.set("workspaceInfo", revision);
    this.state.versions.set("globalVersion", revision);

    await this.sync.acknowledge(this.state.versions, new Map());
  }
}

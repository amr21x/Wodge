import { REPLICACHE_VERSIONS_KEY } from "@wodge/domain/sync/index";
import type { WorkspacePartyInterface } from "@wodge/domain/sync/state";
import type { RecordStorage } from "@wodge/infra/durable-objects/storage";
import { inject, injectable } from "tsyringe";

@injectable()
export class WorkspaceFileRepository {
  constructor(
    @inject("storage")
    private readonly storage: Pick<RecordStorage, "put">,
    @inject("workspace") private readonly state: WorkspacePartyInterface,
  ) {}

  async saveChange() {
    const revision = this.state.versions.get("globalVersion")! + 1;

    this.state.versions.set("workspaceInfo", revision);
    this.state.versions.set("globalVersion", revision);

    await this.storage.put(REPLICACHE_VERSIONS_KEY, this.state.versions);
  }
}

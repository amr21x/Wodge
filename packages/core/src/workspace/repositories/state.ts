import { makeWorkspaceStructureKey } from "@wodge/domain/sync/index";
import type { WorkspacePartyInterface } from "@wodge/domain/sync/state";
import type {
  WorkspaceMembers,
  WorkspaceStructure,
} from "@wodge/domain/workspace/models";
import type { RecordStorage } from "@wodge/infra/durable-objects/storage";
import { inject, injectable } from "tsyringe";

@injectable()
export class WorkspaceStateRepository {
  constructor(
    @inject("storage")
    protected readonly storage: Pick<RecordStorage, "put">,
    @inject("workspace") protected readonly state: WorkspacePartyInterface,
  ) {}

  get members() {
    return this.state.workspaceMembers.data;
  }

  set members(data: WorkspaceMembers) {
    this.state.workspaceMembers = { ...this.state.workspaceMembers, data };
  }

  get structure() {
    return this.state.workspaceStructure.data;
  }

  set structure(data: WorkspaceStructure) {
    this.state.workspaceStructure = { ...this.state.workspaceStructure, data };
  }

  private markStructure(revision: number) {
    this.state.workspaceStructure = {
      ...this.state.workspaceStructure,
      lastModifiedVersion: revision,
    };
  }

  async saveStructure(
    revision = this.state.versions.get("globalVersion")! + 1,
  ) {
    this.markStructure(revision);

    await this.storage.put(
      makeWorkspaceStructureKey(),
      this.state.workspaceStructure,
    );
  }
}

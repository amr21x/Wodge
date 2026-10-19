import { makeWorkspacesStoreKey } from "@wodge/domain/sync/index";
import type { UserPartyInterface } from "@wodge/domain/sync/state";
import type { RecordStorage } from "@wodge/infra/durable-objects/storage";
import { inject, injectable } from "tsyringe";

@injectable()
export class UserWorkspaceRepository {
  constructor(
    @inject("storage")
    private readonly storage: Pick<RecordStorage, "put">,
    @inject("user") private readonly state: UserPartyInterface,
  ) {}

  list() {
    return [...this.state.workspacesStore];
  }

  async add(workspaceId: string) {
    this.state.workspacesStore.add(workspaceId);

    await this.save();
  }

  async remove(workspaceId: string) {
    this.state.workspacesStore.delete(workspaceId);

    await this.save();
  }

  private save() {
    return this.storage.put({
      [makeWorkspacesStoreKey()]: this.state.workspacesStore,
    });
  }
}

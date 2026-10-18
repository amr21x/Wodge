import { WorkspaceStateRepository } from "@wodge/core/workspace/repositories/state";
import {
  REPLICACHE_VERSIONS_KEY,
  WORKSPACE_PRESENCE_KEY,
  makeWorkspaceMembersKey,
  makeWorkspaceStructureKey,
} from "@wodge/domain/sync/index";
import type { WorkspacePartyInterface } from "@wodge/domain/sync/state";
import type { RecordStorage } from "@wodge/infra/durable-objects/storage";
import { inject, injectable } from "tsyringe";

@injectable()
export class WorkspaceLifecycleRepository extends WorkspaceStateRepository {
  constructor(
    @inject("storage") storage: Pick<RecordStorage, "put">,
    @inject("workspace") state: WorkspacePartyInterface,
  ) {
    super(storage, state);
  }

  get presence() {
    return this.state.presenceMap;
  }

  set presence(value: Map<string, boolean>) {
    this.state.presenceMap = value;
  }

  private next() {
    return this.state.versions.get("globalVersion")! + 1;
  }

  private mark(revision: number, members = true, structure = true) {
    if (members) {
      this.state.workspaceMembers = {
        ...this.state.workspaceMembers,
        lastModifiedVersion: revision,
      };
    }

    if (structure) {
      this.state.workspaceStructure = {
        ...this.state.workspaceStructure,
        lastModifiedVersion: revision,
      };
    }
  }

  private records() {
    return {
      [makeWorkspaceMembersKey()]: this.state.workspaceMembers,
      [makeWorkspaceStructureKey()]: this.state.workspaceStructure,
    };
  }

  async saveCreatedWorkspace() {
    const revision = (this.state.versions.get("globalVersion") || 0) + 1;

    this.mark(revision);
    this.state.versions.set("globalVersion", revision);
    this.state.versions.set("workspaceInfo", revision);

    await this.storage.put({
      ...this.records(),
      [REPLICACHE_VERSIONS_KEY]: this.state.versions,
      [WORKSPACE_PRESENCE_KEY]: this.state.presenceMap,
    });
  }

  async saveMembershipProjection() {
    const revision = this.next();
    this.mark(revision);
    this.state.versions.set("globalVersion", revision);
    await this.storage.put({
      ...this.records(),
      [REPLICACHE_VERSIONS_KEY]: this.state.versions,
      [WORKSPACE_PRESENCE_KEY]: this.state.presenceMap,
    });
  }

  async saveDeletedWorkspace() {
    this.mark(0);
    this.state.workspaceMembers = {
      ...this.state.workspaceMembers,
      deleted: false,
    };
    this.state.workspaceStructure = {
      ...this.state.workspaceStructure,
      deleted: false,
    };
    this.state.versions = new Map([
      ["globalVersion", 0],
      ["workspaceInfo", 0],
    ]);

    await this.storage.put({
      ...this.records(),
      REPLICACHE_VERSIONS_KEY: this.state.versions,
      WORKSPACE_PRESENCE_KEY: this.state.presenceMap,
    });
  }

  async saveMemberUpdate() {
    const revision = this.next();

    this.mark(revision, true, false);
    this.state.versions.set("globalVersion", revision);

    await this.storage.put({
      [makeWorkspaceMembersKey()]: this.state.workspaceMembers,
      REPLICACHE_VERSIONS_KEY: this.state.versions,
    });
  }

  async saveWorkspaceUpdate() {
    const revision = this.next();

    this.state.versions.set("globalVersion", revision);
    this.state.versions.set("workspaceInfo", revision);

    await this.storage.put(REPLICACHE_VERSIONS_KEY, this.state.versions);
  }

  async savePresence() {
    await this.storage.put(WORKSPACE_PRESENCE_KEY, this.state.presenceMap);
  }
}

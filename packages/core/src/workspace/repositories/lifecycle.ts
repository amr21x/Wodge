import { ObjectSyncRepository } from "@wodge/core/sync/repositories/state";
import type { ObjectDatabase } from "@wodge/infra/database/object-database";
import { WorkspaceRecordRepository } from "@wodge/core/workspace/repositories/records";
import { WorkspaceStateRepository } from "@wodge/core/workspace/repositories/state";
import type { WorkspacePartyInterface } from "@wodge/domain/sync/state";
import { inject, injectable } from "tsyringe";

@injectable()
export class WorkspaceLifecycleRepository extends WorkspaceStateRepository {
  constructor(
    @inject(WorkspaceRecordRepository) records: WorkspaceRecordRepository,
    @inject(ObjectSyncRepository) private readonly sync: ObjectSyncRepository,
    @inject("workspace") state: WorkspacePartyInterface,
    @inject("objectDatabase") db: ObjectDatabase,
  ) {
    super(records, state, db);
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

  private async saveRecords() {
    await this.records.initialize();
    this.db.transaction(() => {
      this.records.writeMembers(this.state.workspaceMembers);
      this.records.writeStructure(this.state.workspaceStructure);
      this.sync.saveVersions(this.state.versions);
      this.records.writePresence(this.state.presenceMap);
    });
  }

  async saveCreatedWorkspace() {
    const revision = (this.state.versions.get("globalVersion") || 0) + 1;

    this.mark(revision);
    this.state.versions.set("globalVersion", revision);
    this.state.versions.set("workspaceInfo", revision);

    await this.saveRecords();
  }

  async saveMembershipProjection() {
    const revision = this.next();
    this.mark(revision);
    this.state.versions.set("globalVersion", revision);
    await this.saveRecords();
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

    await this.saveRecords();
  }

  async saveMemberUpdate() {
    const revision = this.next();

    this.mark(revision, true, false);
    this.state.versions.set("globalVersion", revision);

    await this.records.saveMembers(this.state.workspaceMembers);
    await this.sync.acknowledge(this.state.versions, new Map());
  }

  async saveWorkspaceUpdate() {
    const revision = this.next();

    this.state.versions.set("globalVersion", revision);
    this.state.versions.set("workspaceInfo", revision);

    await this.sync.acknowledge(this.state.versions, new Map());
  }

  async savePresence() {
    await this.records.initialize();
    this.records.writePresence(this.state.presenceMap);
  }
}

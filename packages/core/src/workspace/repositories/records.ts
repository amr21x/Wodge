import { inject, injectable } from "tsyringe";

import {
  defaultWorkspaceMembers,
  defaultWorkspaceStructure,
} from "@wodge/core/workspace/defaults";
import {
  REPLICACHE_VERSIONS_KEY,
  WORKSPACE_PRESENCE_KEY,
  makeWorkspaceMembersKey,
  makeWorkspaceStructureKey,
} from "@wodge/domain/sync/index";
import type {
  Versions,
  WorkspacePartyInterface,
} from "@wodge/domain/sync/state";
import type { RecordStorage } from "@wodge/infra/durable-objects/storage";

@injectable()
export class WorkspaceRecordRepository {
  constructor(
    @inject("storage")
    private readonly storage: Pick<RecordStorage, "get" | "put">,
  ) {}
  async loadWorkspace(): Promise<WorkspacePartyInterface> {
    const membersKey = makeWorkspaceMembersKey();
    const structureKey = makeWorkspaceStructureKey();
    const records = await this.storage.get([
      membersKey,
      structureKey,
      REPLICACHE_VERSIONS_KEY,
      WORKSPACE_PRESENCE_KEY,
    ]);

    return {
      workspaceMembers: (records.get(
        membersKey,
      ) as WorkspacePartyInterface["workspaceMembers"]) ?? {
        data: defaultWorkspaceMembers(),
        lastModifiedVersion: 0,
        deleted: false,
      },
      workspaceStructure: (records.get(
        structureKey,
      ) as WorkspacePartyInterface["workspaceStructure"]) ?? {
        data: defaultWorkspaceStructure(),
        lastModifiedVersion: 0,
        deleted: false,
      },
      versions:
        (records.get(REPLICACHE_VERSIONS_KEY) as Versions) ??
        new Map([
          ["globalVersion", 0],
          ["workspaceInfo", 0],
        ]),
      presenceMap:
        (records.get(WORKSPACE_PRESENCE_KEY) as Map<string, boolean>) ??
        new Map(),
    };
  }
}

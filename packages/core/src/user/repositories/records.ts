import { inject, injectable } from "tsyringe";

import {
  REPLICACHE_VERSIONS_KEY,
  makeWorkspacesStoreKey,
} from "@wodge/domain/sync/index";
import type { RecordStorage } from "@wodge/infra/durable-objects/storage";

import type { UserPartyInterface, Versions } from "@wodge/domain/sync/state";

@injectable()
export class UserRecordRepository {
  constructor(
    @inject("storage")
    private readonly storage: Pick<RecordStorage, "get" | "put">,
  ) {}
  async loadUser(): Promise<UserPartyInterface> {
    const records = await this.storage.get([
      REPLICACHE_VERSIONS_KEY,
      makeWorkspacesStoreKey(),
    ]);

    return {
      versions:
        (records.get(REPLICACHE_VERSIONS_KEY) as Versions) ??
        new Map([["globalVersion", 0]]),
      workspacesStore:
        (records.get(makeWorkspacesStoreKey()) as Set<string>) ?? new Set(),
    };
  }
}

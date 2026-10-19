import { inject, injectable } from "tsyringe";

import { REPLICACHE_VERSIONS_KEY } from "@wodge/domain/sync/index";
import type { RecordStorage } from "@wodge/infra/durable-objects/storage";

import type { ThreadPartyInterface, Versions } from "@wodge/domain/sync/state";

@injectable()
export class DiscussionRecordRepository {
  constructor(
    @inject("storage")
    private readonly storage: Pick<RecordStorage, "get" | "put">,
  ) {}
  private async versions(): Promise<Versions> {
    return (
      (await this.storage.get<Versions>(REPLICACHE_VERSIONS_KEY)) ??
      new Map([["globalVersion", 0]])
    );
  }

  async loadThread(): Promise<ThreadPartyInterface> {
    return {
      threadPosts: (await this.storage.get<ThreadPartyInterface["threadPosts"]>(
        "posts",
      )) ?? { data: [], lastModifiedVersion: 0, deleted: false },
      versions: await this.versions(),
    };
  }
}

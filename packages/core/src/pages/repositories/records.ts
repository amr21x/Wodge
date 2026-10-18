import { inject, injectable } from "tsyringe";

import { REPLICACHE_VERSIONS_KEY } from "@wodge/domain/sync/index";
import type { RecordStorage } from "@wodge/infra/durable-objects/storage";

import type { PagePartyInterface, Versions } from "@wodge/domain/sync/state";

@injectable()
export class PageRecordRepository {
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

  async loadPage(): Promise<PagePartyInterface> {
    return {
      state: {
        record: (await this.storage.get<PagePartyInterface["state"]["record"]>(
          "db",
        )) ?? {
          data: { columns: [], tasks: [] },
          lastModifiedVersion: 0,
          deleted: false,
        },
      },
      versions: await this.versions(),
    };
  }

  loadPageSnapshot() {
    return this.storage.get<Uint8Array>("yjs:snapshot");
  }

  savePageSnapshot(snapshot: Uint8Array) {
    return this.storage.put("yjs:snapshot", snapshot);
  }
}

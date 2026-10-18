import type { RoomAuthorizationScope } from "@wodge/domain/authorization/models";
import { REPLICACHE_VERSIONS_KEY } from "@wodge/domain/sync/index";
import type { RecordStorage } from "@wodge/infra/durable-objects/storage";
import { inject, injectable } from "tsyringe";

import type { RoomPartyInterface, Versions } from "@wodge/domain/sync/state";

@injectable()
export class RoomRecordRepository {
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

  async loadRoom(): Promise<RoomPartyInterface> {
    return {
      messages: (await this.storage.get<RoomPartyInterface["messages"]>(
        "messages",
      )) ?? { data: [], lastModifiedVersion: 0, deleted: false },
      versions: await this.versions(),
    };
  }

  loadRoomScope() {
    return this.storage.get<RoomAuthorizationScope>(
      "authorization:room-scope:v1",
    );
  }

  saveRoomScope(scope: RoomAuthorizationScope) {
    return this.storage.put("authorization:room-scope:v1", scope);
  }

  async hasRoomRecords() {
    const messages = await this.storage.get("messages");
    const versions = await this.storage.get(REPLICACHE_VERSIONS_KEY);
    return messages !== undefined || versions !== undefined;
  }
}

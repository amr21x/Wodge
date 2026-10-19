import type { Message } from "@wodge/domain/rooms/models";
import type { RoomPartyInterface } from "@wodge/domain/sync/state";
import type { RecordStorage } from "@wodge/infra/durable-objects/storage";
import { inject, injectable } from "tsyringe";

// This repository reads and writes the aggregate state retained by its room object.
@injectable()
export class RoomRepository {
  constructor(
    @inject("storage")
    private readonly storage: Pick<RecordStorage, "put">,
    @inject("room") private readonly state: RoomPartyInterface,
  ) {}

  get(): Message[] {
    return this.state.messages.data;
  }

  async save(
    data: Message[],
    revision = this.state.versions.get("globalVersion")! + 1,
  ) {
    this.state.messages = {
      ...this.state.messages,
      data,
      lastModifiedVersion: revision,
    };

    await this.storage.put("messages", this.state.messages);
  }
}

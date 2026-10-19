import type { Db } from "@wodge/domain/pages/models";
import type { PagePartyInterface } from "@wodge/domain/sync/state";
import type { RecordStorage } from "@wodge/infra/durable-objects/storage";
import { inject, injectable } from "tsyringe";

@injectable()
export class PageRepository {
  constructor(
    @inject("storage")
    private readonly storage: Pick<RecordStorage, "put">,
    @inject("page") private readonly state: PagePartyInterface,
  ) {}

  get(): Db {
    return this.state.state.record.data;
  }

  async save(
    data: Db,
    revision = this.state.versions.get("globalVersion")! + 1,
  ) {
    this.state.state.record = {
      ...this.state.state.record,
      data,
      lastModifiedVersion: revision,
    };

    await this.storage.put("db", this.state.state.record);
  }
}

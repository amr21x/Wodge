import type { ThreadPost } from "@wodge/domain/discussions/models";
import type { ThreadPartyInterface } from "@wodge/domain/sync/state";
import type { RecordStorage } from "@wodge/infra/durable-objects/storage";
import { inject, injectable } from "tsyringe";

@injectable()
export class DiscussionRepository {
  constructor(
    @inject("storage")
    private readonly storage: Pick<RecordStorage, "put">,
    @inject("thread") private readonly state: ThreadPartyInterface,
  ) {}

  get(): ThreadPost[] {
    return this.state.threadPosts.data;
  }

  async save(
    data: ThreadPost[],
    revision = this.state.versions.get("globalVersion")! + 1,
  ) {
    this.state.threadPosts = {
      ...this.state.threadPosts,
      data,
      lastModifiedVersion: revision,
    };

    await this.storage.put("posts", this.state.threadPosts);
  }
}

import { ObjectSyncRepository } from "@wodge/core/sync/repositories/state";
import { inject, injectable } from "tsyringe";
import type { HonoRequest } from "hono";
import type UserServer from "../../servers/user";
import { repPull, repPush } from "./replicache";

@injectable()
export class UserSync {
  constructor(
    @inject(ObjectSyncRepository)
    private readonly records: ObjectSyncRepository,
    @inject("user") private readonly party: UserServer,
  ) {}

  pull(req: HonoRequest) {
    return repPull({
      req,
      storage: this.records,
      versions: this.party.versions,
      patcher: async () => [],
    });
  }

  async push(req: HonoRequest) {
    const response = await repPush({
      req,
      storage: this.records,
      versions: this.party.versions,
      runner: async () => {},
    });
    if (response.status === 200) this.party.poke();
    return response;
  }
}

import type { DurableObjectStorage } from "@cloudflare/workers-types";
import { inject, injectable } from "tsyringe";

/** Persist a retry alarm so failed authorization invalidations can resume after eviction. */
@injectable()
export class AuthorizationRetry {
  constructor(
    @inject("storage")
    private readonly storage: Pick<DurableObjectStorage, "setAlarm">,
  ) {}

  schedule() {
    return this.storage.setAlarm(Date.now() + 5_000);
  }
}

import {
  FLAG_MAX_STALE_MS,
  FLAG_REQUEST_TIMEOUT_MS,
} from "@wodge/domain/features/models";
import { createFlagReader, resolveFlags } from "../flags";
import { FeatureFlagRepository } from "../repositories/flags";
import { inject, injectable } from "tsyringe";

@injectable()
export class FeatureFlagService {
  constructor(
    @inject(FeatureFlagRepository)
    private readonly flags: FeatureFlagRepository,
  ) {}

  // One last-known-good snapshot per runtime; failed reads never extend its expiry.
  readonly read = createFlagReader(async () => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const rows = await Promise.race([
        this.flags.list(),
        new Promise<never>((_, reject) => {
          timer = setTimeout(
            () => reject(new Error("Feature flag read timed out")),
            FLAG_REQUEST_TIMEOUT_MS,
          );
        }),
      ]);
      return {
        flags: resolveFlags(rows),
        validUntil: Date.now() + FLAG_MAX_STALE_MS,
        source: "database",
      };
    } finally {
      clearTimeout(timer);
    }
  });
}

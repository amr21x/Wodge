import { featureFlags } from "@wodge/domain/features/schema/d1";
import type { Database } from "@wodge/infra/database/types";
import { inject, injectable } from "tsyringe";

@injectable()
export class FeatureFlagRepository {
  constructor(@inject("database") private readonly database: Database) {}

  async list() {
    return this.database.select().from(featureFlags);
  }
}

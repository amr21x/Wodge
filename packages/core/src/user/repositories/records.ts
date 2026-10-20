import { ObjectSyncRepository } from "@wodge/core/sync/repositories/state";
import {
  user_structure_import,
  user_workspaces,
} from "@wodge/domain/user/schema/object";
import type { ObjectDatabase } from "@wodge/infra/database/object-database";
import { prepareObjectDatabase } from "@wodge/infra/database/object-migrations";
import { eq } from "drizzle-orm";
import { inject, injectable } from "tsyringe";
import { makeWorkspacesStoreKey } from "@wodge/domain/sync/index";
import type { UserPartyInterface } from "@wodge/domain/sync/state";
import type { LegacyRecordStorage } from "@wodge/infra/durable-objects/storage";
import { reconcileRows } from "@wodge/infra/database/durable-sql";

@injectable()
export class UserRecordRepository {
  constructor(
    @inject("storage") private readonly legacyStorage: LegacyRecordStorage,
    @inject("objectDatabase") private readonly db: ObjectDatabase,
    @inject(ObjectSyncRepository) private readonly sync: ObjectSyncRepository,
  ) {}
  private initialization?: Promise<void>;
  initialize() {
    return (this.initialization ??= this.loadUser().then(() => {}));
  }
  private prepare() {
    return prepareObjectDatabase(this.db, "user");
  }
  async loadUser(): Promise<UserPartyInterface> {
    await this.prepare();
    if (
      !this.db
        .select()
        .from(user_structure_import)
        .where(eq(user_structure_import.id, 1))
        .all().length
    ) {
      const legacy = await this.legacyStorage.get<Set<string>>(
        makeWorkspacesStoreKey(),
      );
      await this.saveWorkspaces(legacy ?? new Set());
    }
    return {
      versions: await this.sync.loadVersions(),
      workspacesStore: new Set(
        this.db
          .select()
          .from(user_workspaces)
          .orderBy(user_workspaces.position)
          .all()
          .map((row) => row.workspace_id),
      ),
    };
  }
  async saveWorkspaces(workspaces: Set<string>) {
    await this.prepare();
    this.db.transaction(() => {
      reconcileRows(
        this.db,
        user_workspaces,
        ["workspace_id"],
        [...workspaces].map((id, position) => ({
          workspace_id: id,
          position: position,
        })),
      );
      this.db
        .insert(user_structure_import)
        .values({ id: 1 })
        .onConflictDoNothing()
        .run();
    });
  }
}

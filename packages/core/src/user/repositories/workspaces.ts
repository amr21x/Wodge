import { eq, max } from "drizzle-orm";
import type { UserPartyInterface } from "@wodge/domain/sync/state";
import { user_workspaces } from "@wodge/domain/user/schema/object";
import { UserRecordRepository } from "@wodge/core/user/repositories/records";
import type { ObjectDatabase } from "@wodge/infra/database/object-database";
import { inject, injectable } from "tsyringe";
@injectable()
export class UserWorkspaceRepository {
  constructor(
    @inject(UserRecordRepository)
    private readonly records: UserRecordRepository,
    @inject("user") private readonly state: UserPartyInterface,
    @inject("objectDatabase") private readonly db: ObjectDatabase,
  ) {}
  async list() {
    await this.records.initialize();
    return this.read();
  }
  private read() {
    return this.db
      .select()
      .from(user_workspaces)
      .orderBy(user_workspaces.position)
      .all()
      .map((row) => row.workspace_id);
  }
  async add(workspaceId: string) {
    await this.records.initialize();
    this.db.transaction(() => {
      const position =
        (this.db
          .select({ value: max(user_workspaces.position) })
          .from(user_workspaces)
          .get()?.value ?? -1) + 1;
      this.db
        .insert(user_workspaces)
        .values({ workspace_id: workspaceId, position })
        .onConflictDoNothing()
        .run();
    });
    this.state.workspacesStore = new Set(this.read());
  }
  async remove(workspaceId: string) {
    await this.records.initialize();
    this.db
      .delete(user_workspaces)
      .where(eq(user_workspaces.workspace_id, workspaceId))
      .run();
    this.state.workspacesStore = new Set(this.read());
  }
}

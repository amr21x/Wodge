import { ObjectSyncRepository } from "@wodge/core/sync/repositories/state";
import type { Column, Task } from "@wodge/domain/pages/models";
import {
  page_task_assignees,
  page_columns,
  page_tasks,
} from "@wodge/domain/pages/schema/object";
import type { ObjectDatabase } from "@wodge/infra/database/object-database";
import { prepareObjectDatabase } from "@wodge/infra/database/object-migrations";
import { inject, injectable } from "tsyringe";
import { ColumnSchema, TaskSchema } from "@wodge/domain/pages/validation";
import type { PagePartyInterface } from "@wodge/domain/sync/state";
import type { LegacyRecordStorage } from "@wodge/infra/durable-objects/storage";
import { reconcileRows } from "@wodge/infra/database/durable-sql";
import {
  loadRecordMetadata,
  saveRecordMetadata,
} from "@wodge/core/sync/repositories/metadata";

@injectable()
export class PageRecordRepository {
  constructor(
    @inject("storage") private readonly legacyStorage: LegacyRecordStorage,
    @inject("objectDatabase") private readonly db: ObjectDatabase,
    @inject(ObjectSyncRepository) private readonly sync: ObjectSyncRepository,
  ) {}
  private initialization?: Promise<void>;
  initialize() {
    return (this.initialization ??= this.loadPage().then(() => {}));
  }
  private prepare() {
    return prepareObjectDatabase(this.db, "page");
  }
  async loadPage(): Promise<PagePartyInterface> {
    await this.prepare();
    if (!loadRecordMetadata(this.db, "page")) {
      const legacy =
        await this.legacyStorage.get<PagePartyInterface["state"]["record"]>(
          "db",
        );
      await this.savePage(
        legacy ?? {
          data: { columns: [], tasks: [] },
          lastModifiedVersion: 0,
          deleted: false,
        },
      );
    }
    return {
      state: { record: this.readPage() },
      versions: await this.sync.loadVersions(),
    };
  }
  readPage() {
    const assignees = new Map<string, string[]>();
    for (const row of this.db
      .select()
      .from(page_task_assignees)
      .orderBy(page_task_assignees.position)
      .all()) {
      const list = assignees.get(row.task_id) ?? [];
      list.push(row.user_id);
      assignees.set(row.task_id, list);
    }
    const columns = this.db
      .select()
      .from(page_columns)
      .orderBy(page_columns.position)
      .all()
      .map((row) =>
        ColumnSchema.parse({ id: row.id, title: row.title ?? undefined }),
      );
    const tasks = this.db
      .select()
      .from(page_tasks)
      .orderBy(page_tasks.position)
      .all()
      .map((row) =>
        TaskSchema.parse({
          id: row.id,
          columnId: row.column_id,
          overview: row.overview ?? undefined,
          title: row.title ?? undefined,
          due:
            row.has_due === 1
              ? { from: row.due_from ?? undefined, to: row.due_to ?? undefined }
              : undefined,
          assignee:
            row.has_assignees === 1
              ? (assignees.get(String(row.id)) ?? [])
              : undefined,
          priority: row.priority ?? undefined,
          includeTime: row.include_time === 1,
        }),
      );
    return {
      ...loadRecordMetadata(this.db, "page")!,
      data: { columns, tasks },
    };
  }

  async savePage(record: PagePartyInterface["state"]["record"]) {
    await this.prepare();
    this.db.transaction(() => {
      reconcileRows(
        this.db,
        page_columns,
        ["id"],
        record.data.columns.map(columnRow),
      );
      reconcileRows(
        this.db,
        page_tasks,
        ["id"],
        record.data.tasks.map(taskRow),
      );
      reconcileRows(
        this.db,
        page_task_assignees,
        ["task_id", "position"],
        record.data.tasks.flatMap((task) =>
          (task.assignee ?? []).map((userId, position) => ({
            task_id: task.id,
            position: position,
            user_id: userId,
          })),
        ),
      );
      saveRecordMetadata(this.db, "page", record);
    });
  }
}

export function columnRow(column: Column, position: number) {
  return {
    id: column.id,
    position: position,
    title: column.title ?? null,
  };
}
export function taskRow(task: Task, position: number) {
  return {
    id: task.id,
    column_id: task.columnId,
    position: position,
    overview: task.overview ?? null,
    title: task.title ?? null,
    due_from: task.due?.from ?? null,
    due_to: task.due?.to ?? null,
    has_due: Number(task.due !== undefined),
    has_assignees: Number(task.assignee !== undefined),
    priority: task.priority ?? null,
    include_time: Number(task.includeTime ?? false),
  };
}

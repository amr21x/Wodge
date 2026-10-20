import { and, eq, gt, gte, lt, lte, max, sql } from "drizzle-orm";
import { inject, injectable } from "tsyringe";
import {
  page_columns,
  page_tasks,
  page_task_assignees,
} from "@wodge/domain/pages/schema/object";
import type { Column, Task } from "@wodge/domain/pages/models";
import type { PagePartyInterface } from "@wodge/domain/sync/state";
import type { ObjectDatabase } from "@wodge/infra/database/object-database";
import { PageRecordRepository, taskRow, columnRow } from "./records";
import {
  loadRecordMetadata,
  saveRecordMetadata,
} from "@wodge/core/sync/repositories/metadata";

@injectable()
export class PageRepository {
  constructor(
    @inject(PageRecordRepository)
    private readonly records: PageRecordRepository,
    @inject("page") private readonly state: PagePartyInterface,
    @inject("objectDatabase") private readonly db: ObjectDatabase,
  ) {}
  async change(revision: number | undefined, operation: () => void) {
    await this.records.initialize();
    const next = this.db.transaction(() => {
      operation();
      saveRecordMetadata(this.db, "page", {
        deleted: loadRecordMetadata(this.db, "page")?.deleted ?? false,
        lastModifiedVersion:
          revision ?? this.state.versions.get("globalVersion")! + 1,
      });
      return this.records.readPage();
    });
    // Publish the sync projection only after all entity writes have committed.
    this.state.state.record = next;
  }
  findColumn(id: string) {
    return this.db
      .select()
      .from(page_columns)
      .where(eq(page_columns.id, id))
      .get();
  }
  findTask(id: string) {
    return this.db.select().from(page_tasks).where(eq(page_tasks.id, id)).get();
  }
  insertColumn(column: Column) {
    const position =
      (this.db
        .select({ value: max(page_columns.position) })
        .from(page_columns)
        .get()?.value ?? -1) + 1;
    this.db.insert(page_columns).values(columnRow(column, position)).run();
  }
  updateColumn(column: Column) {
    this.db
      .update(page_columns)
      .set({ title: column.title ?? null })
      .where(eq(page_columns.id, column.id))
      .run();
  }
  deleteColumn(id: string) {
    this.db.delete(page_tasks).where(eq(page_tasks.column_id, id)).run();
    this.db.delete(page_columns).where(eq(page_columns.id, id)).run();
  }
  insertTask(task: Task) {
    const position =
      (this.db
        .select({ value: max(page_tasks.position) })
        .from(page_tasks)
        .get()?.value ?? -1) + 1;
    this.db.insert(page_tasks).values(taskRow(task, position)).run();
    this.replaceAssignees(task);
  }
  updateTask(task: Task) {
    const stored = this.findTask(task.id);
    if (!stored) return;
    this.db
      .update(page_tasks)
      .set(taskRow(task, stored.position))
      .where(eq(page_tasks.id, task.id))
      .run();
    this.replaceAssignees(task);
  }
  private replaceAssignees(task: Task) {
    this.db
      .delete(page_task_assignees)
      .where(eq(page_task_assignees.task_id, task.id))
      .run();
    for (const [position, user_id] of (task.assignee ?? []).entries())
      this.db
        .insert(page_task_assignees)
        .values({ task_id: task.id, position, user_id })
        .run();
  }
  deleteTask(id: string) {
    this.db.delete(page_tasks).where(eq(page_tasks.id, id)).run();
  }
  swapColumns(
    a: typeof page_columns.$inferSelect,
    b: typeof page_columns.$inferSelect,
  ) {
    this.db
      .update(page_columns)
      .set({ position: b.position })
      .where(eq(page_columns.id, a.id))
      .run();
    this.db
      .update(page_columns)
      .set({ position: a.position })
      .where(eq(page_columns.id, b.id))
      .run();
  }
  setTaskColumn(id: string, columnId: string) {
    this.db
      .update(page_tasks)
      .set({ column_id: columnId })
      .where(eq(page_tasks.id, id))
      .run();
  }
  firstTask(columnId: string) {
    return this.db
      .select()
      .from(page_tasks)
      .where(eq(page_tasks.column_id, columnId))
      .orderBy(page_tasks.position)
      .limit(1)
      .get();
  }
  swapTasks(
    a: typeof page_tasks.$inferSelect,
    b: typeof page_tasks.$inferSelect,
  ) {
    this.db
      .update(page_tasks)
      .set({ position: b.position })
      .where(eq(page_tasks.id, a.id))
      .run();
    this.db
      .update(page_tasks)
      .set({ position: a.position })
      .where(eq(page_tasks.id, b.id))
      .run();
  }
  moveTask(
    a: typeof page_tasks.$inferSelect,
    b: typeof page_tasks.$inferSelect,
  ) {
    if (a.position < b.position)
      this.db
        .update(page_tasks)
        .set({ position: sql`${page_tasks.position}-1` })
        .where(
          and(
            gt(page_tasks.position, a.position),
            lte(page_tasks.position, b.position),
          ),
        )
        .run();
    else
      this.db
        .update(page_tasks)
        .set({ position: sql`${page_tasks.position}+1` })
        .where(
          and(
            gte(page_tasks.position, b.position),
            lt(page_tasks.position, a.position),
          ),
        )
        .run();
    this.db
      .update(page_tasks)
      .set({ column_id: b.column_id, position: b.position })
      .where(eq(page_tasks.id, a.id))
      .run();
  }
}

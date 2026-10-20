import { PageRepository } from "@wodge/core/pages/repositories/page";
import type { PageActor, PageInputs } from "@wodge/domain/pages/dto";
import { inject, injectable } from "tsyringe";

@injectable()
export class PageService {
  constructor(
    @inject(PageRepository) private readonly pages: Pick<
      PageRepository,
      keyof PageRepository
    >,
  ) {}
  async createColumn(
    input: PageInputs["createColumn"],
    actor: PageActor,
    revision?: number,
  ) {
    return this.pages.change(revision, () => this.pages.insertColumn(input));
  }
  async deleteColumn(
    input: PageInputs["deleteColumn"],
    actor: PageActor,
    revision?: number,
  ) {
    return this.pages.change(revision, () => this.pages.deleteColumn(input.id));
  }
  async updateColumn(
    input: PageInputs["updateColumn"],
    actor: PageActor,
    revision?: number,
  ) {
    return this.pages.change(revision, () => this.pages.updateColumn(input));
  }
  async createTask(
    input: PageInputs["createTask"],
    actor: PageActor,
    revision?: number,
  ) {
    return this.pages.change(revision, () => {
      if (this.pages.findColumn(input.col))
        this.pages.insertTask({
          ...input.task,
          title: input.task.title?.trim(),
          columnId: input.col,
        });
    });
  }
  async editTask(
    input: PageInputs["editTask"],
    actor: PageActor,
    revision?: number,
  ) {
    return this.pages.change(revision, () => this.pages.updateTask(input.task));
  }
  async deleteTask(
    input: PageInputs["deleteTask"],
    actor: PageActor,
    revision?: number,
  ) {
    return this.pages.change(revision, () =>
      this.pages.deleteTask(input.task.id),
    );
  }
  async moveColumns(
    input: PageInputs["moveColumns"],
    actor: PageActor,
    revision?: number,
  ) {
    return this.pages.change(revision, () => {
      if (input.c1 === input.c2) return;
      const a = this.pages.findColumn(input.c1),
        b = this.pages.findColumn(input.c2);
      if (a && b) this.pages.swapColumns(a, b);
    });
  }
  async moveTasks(
    input: PageInputs["moveTasks"],
    actor: PageActor,
    revision?: number,
  ) {
    return this.pages.change(revision, () => {
      if (input.t1 === input.tOrC2) return;
      const active = this.pages.findTask(input.t1);
      if (!active) return;
      if (input.isOverColumn) {
        this.pages.setTaskColumn(active.id, input.tOrC2);
        const first = this.pages.firstTask(input.tOrC2);
        if (first && first.id !== active.id)
          this.pages.swapTasks(active, first);
        return;
      }
      const target = this.pages.findTask(input.tOrC2);
      if (!target) return;
      if (active.column_id !== target.column_id)
        this.pages.moveTask(active, target);
      else this.pages.swapTasks(active, target);
    });
  }
}

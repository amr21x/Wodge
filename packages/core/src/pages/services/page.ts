import { createColumnMutation } from "@wodge/core/pages/mutations/create-column";
import { createTaskMutation } from "@wodge/core/pages/mutations/create-task";
import { deleteColumnMutation } from "@wodge/core/pages/mutations/delete-column";
import { deleteTaskMutation } from "@wodge/core/pages/mutations/delete-task";
import { editTaskMutation } from "@wodge/core/pages/mutations/edit-task";
import { moveColumnsMutation } from "@wodge/core/pages/mutations/move-columns";
import { moveTasksMutation } from "@wodge/core/pages/mutations/move-tasks";
import { updateColumnMutation } from "@wodge/core/pages/mutations/update-column";
import { PageRepository } from "@wodge/core/pages/repositories/page";
import type { PageActor, PageInputs } from "@wodge/domain/pages/dto";
import { inject, injectable } from "tsyringe";

@injectable()
export class PageService {
  constructor(
    @inject(PageRepository)
    private readonly pages: Pick<PageRepository, "get" | "save">,
  ) {}

  async createColumn(
    input: PageInputs["createColumn"],
    actor: PageActor,
    revision?: number,
  ) {
    const data = this.pages.get();

    await this.pages.save(
      {
        ...data,
        columns: createColumnMutation({
          col: input,
          columns: data.columns,
        }),
      },
      revision,
    );
  }

  async deleteColumn(
    input: PageInputs["deleteColumn"],
    actor: PageActor,
    revision?: number,
  ) {
    const data = this.pages.get();
    const { newColumns, newTasks } = deleteColumnMutation({
      col: input,
      ...data,
    });

    await this.pages.save({ columns: newColumns, tasks: newTasks }, revision);
  }

  async updateColumn(
    input: PageInputs["updateColumn"],
    actor: PageActor,
    revision?: number,
  ) {
    const data = this.pages.get();

    await this.pages.save(
      {
        ...data,
        columns: updateColumnMutation({
          col: input,
          columns: data.columns,
        }),
      },
      revision,
    );
  }

  async createTask(
    input: PageInputs["createTask"],
    actor: PageActor,
    revision?: number,
  ) {
    const data = this.pages.get();

    await this.pages.save(
      {
        ...data,
        tasks: createTaskMutation({
          task: input.task,
          colId: input.col,
          ...data,
        }),
      },
      revision,
    );
  }

  async editTask(
    input: PageInputs["editTask"],
    actor: PageActor,
    revision?: number,
  ) {
    const data = this.pages.get();

    await this.pages.save(
      {
        ...data,
        tasks: editTaskMutation({ task: input.task, tasks: data.tasks }),
      },
      revision,
    );
  }

  async deleteTask(
    input: PageInputs["deleteTask"],
    actor: PageActor,
    revision?: number,
  ) {
    const data = this.pages.get();

    await this.pages.save(
      {
        ...data,
        tasks: deleteTaskMutation({
          task: input.task,
          tasks: data.tasks,
        }),
      },
      revision,
    );
  }

  async moveColumns(
    input: PageInputs["moveColumns"],
    actor: PageActor,
    revision?: number,
  ) {
    const data = this.pages.get();

    await this.pages.save(
      {
        ...data,
        columns: moveColumnsMutation({ ...input, columns: data.columns }),
      },
      revision,
    );
  }

  async moveTasks(
    input: PageInputs["moveTasks"],
    actor: PageActor,
    revision?: number,
  ) {
    const data = this.pages.get();

    await this.pages.save(
      {
        ...data,
        tasks: moveTasksMutation({ ...input, ...data }),
      },
      revision,
    );
  }
}

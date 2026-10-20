import type { WriteTransaction } from "replicache";
import { createColumnMutation } from "./mutations/create-column";
import { deleteColumnMutation } from "./mutations/delete-column";
import { updateColumnMutation } from "./mutations/update-column";
import { createTaskMutation } from "./mutations/create-task";
import { editTaskMutation } from "./mutations/edit-task";
import { deleteTaskMutation } from "./mutations/delete-task";
import { moveColumnsMutation } from "./mutations/move-columns";
import { moveTasksMutation } from "./mutations/move-tasks";
import type { Column, Task } from "@wodge/domain/pages/models";
import type {
  CreateColumnArgs,
  CreateTaskArgs,
  EditTaskArgs,
  MoveColumnsArgs,
  MoveTasksArgs,
} from "@wodge/domain/pages/dto";

export const pageMutators = {
  async createColumn(tx: WriteTransaction, data: CreateColumnArgs) {
    const columns = (await tx.get<Column[]>("columns")) || [];

    const newColumns = createColumnMutation({
      col: {
        id: data.id,
        title: data.title?.trim(),
      },
      columns,
    });

    await tx.set("columns", newColumns);
  },

  async deleteColumn(tx: WriteTransaction, data: CreateColumnArgs) {
    const columns = (await tx.get<Column[]>("columns")) || [];
    const tasks = (await tx.get<Task[]>("tasks")) || [];

    const { newColumns, newTasks } = deleteColumnMutation({
      col: {
        id: data.id,
        title: data.title,
      },
      columns,
      tasks,
    });

    await tx.set("columns", newColumns);
    await tx.set("tasks", newTasks);
  },

  async updateColumn(tx: WriteTransaction, data: CreateColumnArgs) {
    const columns = (await tx.get<Column[]>("columns")) || [];

    const newColumns = updateColumnMutation({
      col: {
        id: data.id,
        title: data.title?.trim(),
      },
      columns,
    });

    await tx.set("columns", newColumns);
  },

  async createTask(tx: WriteTransaction, data: CreateTaskArgs) {
    const tasks = (await tx.get<Task[]>("tasks")) || [];
    const columns = (await tx.get<Task[]>("columns")) || [];

    const newTasks = createTaskMutation({
      colId: data.col,
      columns,
      task: data.task,
      tasks,
    });

    await tx.set("tasks", newTasks);
  },

  async editTask(tx: WriteTransaction, data: EditTaskArgs) {
    const tasks = (await tx.get<Task[]>("tasks")) || [];

    const newTasks = editTaskMutation({
      task: data.task,
      tasks,
    });

    await tx.set("tasks", newTasks);
  },
  async deleteTask(tx: WriteTransaction, data: EditTaskArgs) {
    const tasks = (await tx.get<Task[]>("tasks")) || [];

    const newTasks = deleteTaskMutation({
      task: data.task,
      tasks,
    });

    await tx.set("tasks", newTasks);
  },

  async moveColumns(tx: WriteTransaction, data: MoveColumnsArgs) {
    const columns = (await tx.get<Column[]>("columns")) || [];

    const newColumns = moveColumnsMutation({
      c1: data.c1,
      c2: data.c2,
      columns,
    });

    await tx.set("columns", newColumns);
  },

  async moveTasks(tx: WriteTransaction, data: MoveTasksArgs) {
    const tasks = (await tx.get<Task[]>("tasks")) || [];
    const columns = (await tx.get<Task[]>("columns")) || [];

    const newTasks = moveTasksMutation({
      t1: data.t1,
      tOrC2: data.tOrC2,
      isOverColumn: data.isOverColumn,
      tasks,
      columns,
    });

    await tx.set("tasks", newTasks);
  },
};

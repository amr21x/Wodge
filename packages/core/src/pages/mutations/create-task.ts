import { Column, Task } from "@wodge/domain/pages/models";
import type { DrObj } from "@wodge/domain/types";
import { produce } from "immer";

export function createTaskMutation({
  colId,
  task,
  columns,
  tasks,
}: {
  colId: string;
  task: Task;
  tasks: Task[] | DrObj<Task[]>;
  columns: Column[] | DrObj<Column[]>;
}) {
  const newTasks = produce(tasks, (draft) => {
    const column = columns?.find((c) => c.id === colId);

    if (!column) {
      return draft;
    }

    draft.push({
      ...task,
      title: task.title?.trim(),
      columnId: column.id,
    });

    return draft;
  });

  return newTasks as Task[];
}

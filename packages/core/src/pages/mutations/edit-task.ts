import { Task } from "@wodge/domain/pages/models";
import type { DrObj } from "@wodge/domain/types";
import { produce } from "immer";

export function editTaskMutation({
  task,
  tasks,
}: {
  task: Task;
  tasks: Task[] | DrObj<Task[]>;
}) {
  const newTasks = produce(tasks, (draft) => {
    const taskIndex = draft?.findIndex((t) => t.id === task.id);

    if (taskIndex === -1) {
      return draft;
    }

    draft[taskIndex] = {
      ...task,
    };

    return draft;
  });

  return newTasks as Task[];
}

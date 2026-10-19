import { Column, Task } from "@wodge/domain/pages/models";
import type { DrObj } from "@wodge/domain/types";
import { arrayMoveMutable } from "array-move";
import { produce } from "immer";

export function moveTasksMutation({
  t1,
  tOrC2,
  tasks,
  columns,
  isOverColumn,
}: {
  t1: string;
  tOrC2: string;
  tasks: Task[] | DrObj<Task[]>;
  columns: Column[] | DrObj<Column[]>;
  isOverColumn: boolean;
}) {
  if (t1 === tOrC2) {
    return tasks as Task[];
  }

  const newTasks = produce(tasks, (draft) => {
    const activeIndex = draft.findIndex((c) => c.id === t1);

    const overIndex = isOverColumn
      ? columns.findIndex((c) => c.id === tOrC2)
      : draft.findIndex((c) => c.id === tOrC2);

    if (
      !isOverColumn &&
      draft[activeIndex]?.columnId != draft[overIndex]?.columnId
    ) {
      draft[activeIndex]!.columnId = draft[overIndex]!.columnId;

      arrayMoveMutable(draft, activeIndex, overIndex);

      return draft;
    } else if (!isOverColumn) {
      const temp = draft[activeIndex];

      if (!temp) {
        return draft;
      }

      if (!draft[overIndex]) {
        return draft;
      }

      draft[activeIndex] = draft[overIndex]!;
      draft[overIndex] = temp;

      return draft;
    }

    if (isOverColumn) {
      draft[activeIndex]!.columnId = tOrC2;

      const temp = draft[activeIndex]!;
      const firstInCol = draft.findIndex((t) => t.columnId === tOrC2);

      if (firstInCol === -1) {
        draft[activeIndex] = draft[firstInCol]!;
      } else {
        draft[activeIndex] = draft[firstInCol]!;
        draft[firstInCol] = temp;
      }
    }

    return draft;
  });

  return newTasks as Task[];
}

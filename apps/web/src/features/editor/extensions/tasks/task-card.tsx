import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";

import { Sheet, SheetTrigger } from "@/components/ui/sheet";
import { Column, Task } from "@wodge/domain/pages/models";
import { pageMutators } from "@/client/sync/pages/mutators";
import { Replicache } from "replicache";

import { Editor } from "@tiptap/react";
import { TaskItem } from "./task-item";
import { TaskSheet } from "./task-sheet";
import { TaskProvider, useTask } from "./task-provider";

interface TaskCardProps {
  task: Task;
  index?: number;
  rep?: Replicache<typeof pageMutators>;
  col?: Column;
  editor?: Editor;
}

function TaskCard({ task, index, col, rep, editor }: TaskCardProps) {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <TaskProvider task={task} isEditing={isEditing} setIsEditing={setIsEditing}>
      <TaskCardCore
        task={task}
        index={index}
        rep={rep}
        col={col}
        editor={editor}
        isEditing={isEditing}
      />
    </TaskProvider>
  );
}

function TaskCardCore({
  isEditing,
  task,
  index,
  col,
  editor,
  rep,
}: TaskCardProps & { isEditing: boolean }) {
  const {
    setNodeRef,
    attributes,
    listeners,
    over,
    index: curIndex,
    activeIndex,
    isDragging,
  } = useSortable({
    id: task.id,
    data: {
      type: "Task",
      task,
      index,
    },
    disabled: isEditing,
  });

  const { open, setOpen } = useTask();

  const isTaskOver =
    over?.id === task.id && over?.data.current?.type === "Task";

  const isAbove = isTaskOver && activeIndex > curIndex;
  const isBelow = isTaskOver && activeIndex < curIndex;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger disabled={isDragging} asChild>
        <div>
          <TaskItem
            isAbove={isAbove}
            isBelow={isBelow}
            task={task}
            col={col}
            rep={rep}
            editor={editor}
            ref={setNodeRef}
            {...attributes}
            {...listeners}
          />
        </div>
      </SheetTrigger>
      <TaskSheet task={task} rep={rep} />
    </Sheet>
  );
}

export default TaskCard;

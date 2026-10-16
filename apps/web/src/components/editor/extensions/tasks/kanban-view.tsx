import { cn } from "@/lib/utils";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToHorizontalAxis } from "@dnd-kit/modifiers";
import { SortableContext } from "@dnd-kit/sortable";
import { Column, Task } from "@wodge/domain/pages";
import { Editor } from "@tiptap/react";
import { useMemo, useState } from "react";
import ColumnContainer, { ColumnTitle } from "./column-container";
import { Button } from "@/components/ui/button";
import { nanoid } from "nanoid";
import { createPortal } from "react-dom";
import { Plus } from "lucide-react";
import TaskCard from "./task-card";
import { toast } from "sonner";
import { isAfter, isBefore, isEqual } from "date-fns";
import { useDb } from "./db-provider";
import { assigneesAtom, dueAtom, priorityAtom, titleAtom } from "./atom";
import { useAtomValue } from "jotai";

export function KanbanView({ editor }: { editor: Editor }) {
  const [activeColumn, setActiveColumn] = useState<Column | null>(null);

  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        tolerance: 5,
        delay: 250,
      },
    }),
    // useSensor(KeyboardSensor, {
    //   coordinateGetter: sortableKeyboardCoordinates,
    // }),
  );

  const priority = useAtomValue(priorityAtom);
  const title = useAtomValue(titleAtom);
  const assignees = useAtomValue(assigneesAtom);
  const due = useAtomValue(dueAtom);

  const { columns, tasks: baseTasks, rep } = useDb();

  const columnsIds = useMemo(
    () => columns.map((col) => col.id) || [],
    [columns],
  );

  const tasks = useMemo(() => {
    let tasks = baseTasks;
    if (priority) tasks = tasks.filter((t) => t.priority === priority);

    if (title)
      tasks = tasks.filter((t) =>
        t.title?.toLowerCase().includes(title.toLowerCase()),
      );

    if (assignees?.length)
      tasks = tasks.filter((t) =>
        t.assignee?.some((a) => assignees.includes(a)),
      );

    if (due) {
      tasks = tasks.filter((t) => {
        if (!t.due) return false;

        // Given a range
        if (due.from && due.to) {
          if (t.due.from && t.due.to) {
            return (
              (isEqual(due.from, t.due.from) ||
                isAfter(t.due.from, due.from)) &&
              (isEqual(due.to, t.due.to) || isBefore(t.due.to, due.to))
            );
          }

          if (t.due.from) {
            return (
              isEqual(due.from, t.due.from) || isAfter(t.due.from, due.from)
            );
          }

          if (t.due.to) {
            return isEqual(due.from, t.due.to) || isBefore(t.due.to, due.to);
          }

          return false;
        }

        // Given a single data
        const searchDate = due.from || due.to;

        if (!searchDate) return false;

        if (t.due.from) {
          return isEqual(searchDate, t.due.from);
        }

        if (t.due.to) {
          return isEqual(searchDate, t.due.to);
        }

        return false;
      });
    }

    return tasks;
  }, [baseTasks, title, priority, assignees, due]);

  return (
    <div className="flex w-full items-center overflow-x-auto overflow-y-auto pb-4">
      <DndContext
        sensors={sensors}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        // onDragOver={onDragOver}
        modifiers={activeColumn ? [restrictToHorizontalAxis] : []}
      >
        <div
          className={cn(
            "flex",
            columns?.length && columns?.length > 0 && "gap-4",
          )}
        >
          <div className="flex gap-4">
            <SortableContext items={columnsIds}>
              {columns?.map((col) => (
                <ColumnContainer
                  editor={editor}
                  key={col.id}
                  column={col}
                  rep={rep}
                  tasks={tasks.filter((task) => task.columnId === col.id)}
                />
              ))}
            </SortableContext>
          </div>

          <Button
            className="h-9 w-80 justify-start gap-2"
            variant="ghost"
            onClick={async () => {
              try {
                await rep?.mutate.createColumn({
                  id: nanoid(6),
                  title: "New column",
                });
              } catch {
                toast.error("Failed to create column");
              }
            }}
          >
            <Plus className="h-4 w-4" />
            Add column
          </Button>
        </div>

        {createPortal(
          <DragOverlay dropAnimation={null}>
            {activeColumn && <ColumnTitle column={activeColumn} />}
            {activeTask && <TaskCard task={activeTask} />}
          </DragOverlay>,
          document.body,
        )}
      </DndContext>
    </div>
  );

  async function onDragEnd(event: DragEndEvent) {
    setActiveColumn(null);
    setActiveTask(null);

    const { active, over } = event;
    if (!over) return;
    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    const isActiveATask = active.data.current?.type === "Task";
    const isActiveColumn = active.data.current?.type === "Column";

    const isOverATask = over.data.current?.type === "Task";

    if (!isActiveATask && !isActiveColumn) return;

    // Im dropping a Task over another Task
    if (isActiveATask && isOverATask) {
      try {
        await rep?.mutate.moveTasks({
          t1: activeId as string,
          isOverColumn: false,
          tOrC2: overId as string,
        });
      } catch {
        toast.error("Failed to move task");
      }

      return;
    }

    const isOverAColumn = over.data.current?.type === "Column";
    // Im dropping a Task over a column

    if (isActiveATask && isOverAColumn) {
      console.log("Moving task to column");
      try {
        await rep?.mutate.moveTasks({
          t1: activeId as string,
          isOverColumn: true,
          tOrC2: overId as string,
        });
      } catch {
        toast.error("Failed to move task");
      }

      return;
    }

    if (isActiveColumn && isOverAColumn) {
      try {
        await rep?.mutate.moveColumns({
          c1: activeId as string,
          c2: overId as string,
        });
      } catch {
        toast.error("Failed to move column");
      }

      return;
    }
  }

  function onDragStart(event: DragStartEvent) {
    if (event.active.data.current?.type === "Column") {
      //@ts-ignore
      setActiveColumn(event.active.data.current.column);
      return;
    }

    if (event.active.data.current?.type === "Task") {
      // @ts-ignore
      setActiveTask(event.active.data.current.task);
      return;
    }
  }
}

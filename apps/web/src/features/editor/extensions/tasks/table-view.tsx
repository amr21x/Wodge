import { DataTable } from "@/components/data-table/data-table";
import { Button } from "@/components/ui/button";
import { useTable } from "@/features/workspace/settings/use-table";
import { Editor } from "@tiptap/react";
import { createEntityId } from "@wodge/domain/identifiers";
import { Task } from "@wodge/domain/pages/models";
import { isAfter, isBefore } from "date-fns";
import { useAtomValue } from "jotai";
import { isEqual } from "lodash";
import { Plus } from "lucide-react";
import { useMemo } from "react";
import { toast } from "sonner";
import { assigneesAtom, dueAtom, priorityAtom, titleAtom } from "./atom";
import { useDb } from "./db-provider";
import { tasksColumns } from "./tasks-table-columns";

export function TableView({ editor }: { editor: Editor }) {
  const priority = useAtomValue(priorityAtom);
  const title = useAtomValue(titleAtom);
  const assignees = useAtomValue(assigneesAtom);
  const due = useAtomValue(dueAtom);

  const { columns, tasks: baseTasks, rep } = useDb();

  const tasks = useMemo(() => {
    let tasks = baseTasks;

    if (priority) {
      tasks = tasks.filter((t) => t.priority === priority);
    }

    if (title) {
      tasks = tasks.filter((t) =>
        t.title?.toLowerCase().includes(title.toLowerCase()),
      );
    }

    if (assignees?.length) {
      tasks = tasks.filter((t) =>
        t.assignee?.some((a) => assignees.includes(a)),
      );
    }

    if (due) {
      tasks = tasks.filter((t) => {
        if (!t.due) {
          return false;
        }

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

        if (!searchDate) {
          return false;
        }

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

  const table = useTable({
    data: (tasks as Task[]) || [],
    columns: tasksColumns({
      onDeleteTask: async (t) => {
        try {
          await rep?.mutate.deleteTask({
            task: t as Task,
          });
        } catch {
          toast.error("Failed to delete task");
        }
      },
      onEditTask: async (t) => {
        try {
          await rep?.mutate.editTask({
            task: t as Task,
          });
        } catch {
          toast.error("Failed to edit task");
        }
      },
      editor,
      columns,
    }),
  });

  return (
    <div className="w-full overflow-y-auto  border-border">
      <div className="pb-4">
        <DataTable table={table.table} withHeader />

        <Button
          className="mt-2 w-full gap-2"
          variant="ghost"
          size="sm"
          onClick={async () => {
            try {
              const colId = createEntityId();

              if (!columns || columns?.length === 0) {
                await rep?.mutate.createColumn({
                  id: colId,
                  title: "New column",
                });
              }

              await rep?.mutate.createTask({
                col: columns?.[0]?.id || colId,
                task: {
                  columnId: columns?.[0]?.id || colId,
                  id: createEntityId(),
                  includeTime: false,
                },
              });
            } catch {
              toast.error("Failed to add task");
            }
          }}
        >
          <Plus className="h-4 w-4" />
          Add a task
        </Button>
      </div>
    </div>
  );
}

import { SortableContext, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Check, MoreHorizontal, Pencil, Plus, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import TaskCard from "./task-card";

import { pageMutators } from "@/client/sync/pages/mutators";
import { Editor } from "@tiptap/react";
import { createEntityId } from "@wodge/domain/identifiers";
import { Column, Task } from "@wodge/domain/pages/models";
import { DrObj } from "@wodge/domain/types";
import { Replicache } from "replicache";

interface Props {
  column: Column | DrObj<Column>;
  tasks: Task[] | DrObj<Task>[];
  editor: Editor;
  rep?: Replicache<typeof pageMutators>;
}

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { SidebarItemBtn } from "@/features/workspace/components/sidebar-item-btn";
import { cn } from "@/lib/utils/index";
import { toast } from "sonner";
import { useEditable } from "use-editable";

function ColumnContainer({ column, tasks, rep, editor }: Props) {
  const [editMode, setEditMode] = useState(false);

  const [name, setName] = useState(column.title);

  const tasksIds = useMemo(() => {
    return tasks.map((task) => task.id);
  }, [tasks]);

  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: column.id,
    data: {
      type: "Column",
      column,
    },
    disabled: editMode,
  });

  const style = {
    transition,
    transform: CSS.Transform.toString(transform),
  };

  const ref = useRef<HTMLParagraphElement>(null);

  const edit = useEditable(ref, setName, {
    disabled: !editMode,
  });

  useEffect(() => {
    editor?.setEditable(!editMode);

    if (editMode && ref.current) {
      const range = document.createRange();
      const selection = window.getSelection();

      range.setStart(ref.current, ref.current.childNodes.length);
      range.collapse(true);
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  }, [editMode]);

  return (
    <div ref={setNodeRef}>
      <div className="group flex w-64 select-none flex-col rounded-md bg-secondary/30 p-2 transition-all md:w-80">
        {/* Column title */}
        <div
          style={style}
          {...attributes}
          {...listeners}
          className="flex max-w-64 cursor-grab items-center pb-3 md:max-w-80"
        >
          <div className="flex w-full items-start gap-1">
            <p
              ref={ref}
              // contentEditable={editMode}
              suppressContentEditableWarning
              className={cn(
                "max-h-32 overflow-hidden truncate break-words pr-1 font-medium focus:outline-none",
                editMode && "cursor-text",
              )}
              onKeyDown={async (e) => {
                if (editMode && e.key === "Enter") {
                  try {
                    await rep?.mutate.updateColumn({
                      ...column,
                      title: name,
                    });

                    setEditMode(false);
                  } catch {
                    toast.error("Failed to update column");
                  }
                }
              }}
              autoFocus
            >
              {name}
            </p>
            <div className="py-1 text-sm text-muted-foreground transition-all group-hover:text-foreground">
              {tasks.length || 0}
            </div>
            {!editMode && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarItemBtn
                    Icon={MoreHorizontal}
                    className="my-0.5 ml-auto transition-all group-hover:visible md:invisible"
                  />
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem
                    onClick={() => {
                      setEditMode(true);
                    }}
                  >
                    <Pencil className="h-4 w-4 " />
                    Edit column
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    destructive
                    disclosure
                    onDisclosureConfirm={async () => {
                      try {
                        await rep?.mutate.deleteColumn({
                          ...column,
                        });
                      } catch {
                        toast.error("Failed to delete column");
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete column
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {editMode && (
              <>
                <SidebarItemBtn
                  className="my-0.5 ml-auto hover:text-green-600 dark:hover:text-green-500"
                  Icon={Check}
                  onClick={async () => {
                    try {
                      await rep?.mutate.updateColumn({
                        ...column,
                        title: name,
                      });

                      setEditMode(false);
                    } catch {
                      toast.error("Failed to update column");
                    }
                  }}
                />
                <SidebarItemBtn
                  className="my-0.5 hover:text-red-600 dark:hover:text-red-500"
                  Icon={X}
                  onClick={() => {
                    setName(column.title);

                    setEditMode(false);
                  }}
                />
              </>
            )}
          </div>
        </div>

        {/* Column task container */}
        <div className="flex flex-col gap-1.5">
          <SortableContext items={tasksIds}>
            {tasks.map((task, i) => (
              <TaskCard
                key={task.id}
                task={task as Task}
                index={i}
                rep={rep}
                col={column}
                editor={editor}
              />
            ))}
          </SortableContext>
        </div>

        {/* Column footer */}

        <Button
          variant="ghost"
          className="mt-2 gap-1.5 opacity-70 transition-all hover:opacity-100"
          onClick={async () => {
            try {
              await rep?.mutate.createTask({
                col: column.id,
                task: {
                  columnId: column.id,
                  id: createEntityId(),
                  includeTime: false,
                },
              });
            } catch {
              toast.error("Failed to create task");
            }
          }}
        >
          <Plus className="h-4 w-4 " />
          Add task
        </Button>
      </div>
    </div>
  );
}

export function ColumnTitle({ column }: { column: Column }) {
  return (
    <div className="group flex h-fit min-h-0 w-80 flex-col rounded-md bg-secondary/30 p-1.5 transition-all">
      <div className="flex  max-w-80  cursor-grab items-center pb-3">
        <div className="flex w-full items-center gap-1">
          <Input
            className={cn(
              "mr-1 w-fit min-w-0 rounded border p-0 px-1 text-base font-medium outline-none focus-visible:border-none disabled:cursor-grab disabled:opacity-100",
            )}
            value={column.title}
            onChange={(e) => {}}
            inRow
          />

          <SidebarItemBtn
            Icon={MoreHorizontal}
            className="invisible ml-auto transition-all group-hover:visible"
          />
        </div>
      </div>
    </div>
  );
}

export default ColumnContainer;

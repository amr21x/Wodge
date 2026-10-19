import { SidebarItemBtn } from "@/features/workspace/components/sidebar-item-btn";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn, focusElement } from "@/lib/utils/index";

import { Column, Task } from "@wodge/domain/pages/models";
import { pageMutators } from "@/client/sync/pages/mutators";
import { Editor } from "@tiptap/react";
import { Check, MoreHorizontal, PencilLine, Trash2, X } from "lucide-react";
import { forwardRef, useEffect, useRef } from "react";
import { DateRange } from "react-day-picker";
import { Replicache } from "replicache";
import { useEditable } from "use-editable";
import { MemberMultiSelect } from "./member-multi-select";
import { DateTimePicker } from "./date-time-picker";
import { PriorityDropdown } from "./priority-dropdown";
import { toast } from "sonner";
import { useTask } from "./task-provider";

interface TaskItemProps {
  task: Task;
  col?: Column;
  rep?: Replicache<typeof pageMutators>;
  editor?: Editor | null;
  isAbove?: boolean;
  isBelow?: boolean;
}

export const TaskItem = forwardRef<HTMLDivElement, TaskItemProps>(
  ({ task, col, rep, editor, isAbove, isBelow, ...props }, ref) => {
    const { isEditing, setIsEditing, setTitle, title } = useTask();

    const titleRef = useRef<HTMLParagraphElement>(null);

    useEditable(
      titleRef,
      (t) => {
        setTitle(t);
      },
      {
        disabled: !isEditing,
      },
    );

    useEffect(() => {
      editor?.setEditable(!isEditing);

      if (isEditing && titleRef.current) {
        focusElement(titleRef);
      }
    }, [isEditing]);

    async function onEdit(
      newTask?: Omit<Task, "id" | "columnId" | "includeTime">,
      includeTime?: boolean,
    ) {
      try {
        await rep?.mutate.editTask({
          task: {
            ...task,
            includeTime: includeTime || task.includeTime,
            ...newTask,
          },
        });
      } catch {
        toast.error("Failed to edit task");
      }
    }

    const noTitle = !title || title?.trim() === "";

    return (
      <div
        ref={ref}
        onClick={(e) => {
          if (isEditing) {
            e.stopPropagation();
          }
        }}
        className="group/task relative flex h-fit max-h-36 flex-col rounded-md bg-background p-2.5 text-sm hover:bg-background/65"
        {...props}
        aria-disabled={isEditing}
      >
        <div
          className={cn(
            "invisible absolute -top-0 left-1/2 h-1.5 w-[99%] -translate-x-1/2 -translate-y-full rounded-sm bg-sky-500/30 transition-all dark:bg-sky-900/30",
            isAbove && "visible",
          )}
        />
        <div
          className={cn(
            "invisible absolute bottom-0 left-0 h-1.5 w-full translate-y-full rounded-sm bg-sky-500/30 transition-all dark:bg-sky-900/30",
            isBelow && "visible",
          )}
        />
        <div className="flex h-full items-center">
          <p
            ref={titleRef}
            suppressContentEditableWarning
            className={cn(
              "!my-0 max-h-32 w-full overflow-hidden truncate break-words p-1 text-base font-medium focus:outline-none",
              isEditing && "cursor-text",
              noTitle && "text-muted-foreground",
            )}
            onKeyDown={async (e) => {
              if (isEditing && e.key === "Enter") {
                onEdit({ title });
                setIsEditing(false);
              }
            }}
            autoFocus
          >
            {!isEditing && (noTitle ? "Untitled" : task?.title)}
            {isEditing && title}
          </p>

          {isEditing ? (
            <>
              <SidebarItemBtn
                className="ml-auto hover:text-green-600 dark:hover:text-green-500"
                Icon={Check}
                onClick={() => {
                  onEdit({ title });
                  setIsEditing(false);
                }}
              />
              {/* <SidebarItemBtn
                className="hover:text-red-600 dark:hover:text-red-500"
                Icon={X}
                onClick={() => {
                  setIsEditing(false);
                  setTitle(task?.title);
                  setDue(task?.due as DateRange | undefined);
                  setAssignee(task?.assignee || []);
                  setPriority(task?.priority);
                }}
              /> */}
            </>
          ) : (
            <>
              <SidebarItemBtn
                Icon={PencilLine}
                onClick={setIsEditing.bind(null, true)}
                className="invisible ml-auto transition-all md:group-hover/task:visible"
              />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarItemBtn
                    Icon={MoreHorizontal}
                    className="my-0.5 transition-all group-hover/task:visible md:invisible"
                  />
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                >
                  <DropdownMenuItem
                    destructive
                    disclosure
                    onDisclosureConfirm={async () => {
                      try {
                        await rep?.mutate.deleteTask({
                          task,
                        });
                      } catch {
                        toast.error("Failed to delete task");
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete task
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>

        <div
          className="flex flex-col gap-0.5"
          onClick={(e) => {
            if (isEditing) {
              e.stopPropagation();
            }
          }}
        >
          {((task?.assignee && task?.assignee.length > 0) || isEditing) && (
            <MemberMultiSelect
              value={task?.assignee || []}
              setValue={(v) => {
                onEdit({ assignee: v as string[] });
              }}
              isEditing={isEditing}
            />
          )}
          {(task?.due || isEditing) && (
            <DateTimePicker
              date={task?.due as DateRange | undefined}
              onSetDate={(d) => onEdit({ due: d as Task["due"] })}
              isEditing={isEditing}
              includeTime={task?.includeTime}
              setIncludeTime={(i) => onEdit({}, i)}
            />
          )}
          {(task?.priority || isEditing) && (
            <PriorityDropdown
              onSelect={(p) => {
                onEdit({ priority: p });
              }}
              priority={task?.priority}
              isEditing={isEditing}
            />
          )}
        </div>
      </div>
    );
  },
);

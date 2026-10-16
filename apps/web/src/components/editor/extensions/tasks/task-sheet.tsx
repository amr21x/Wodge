import { cn, focusElement } from "@/lib/utils";
import { pageMutators } from "@/client/sync/pages";
import { Task } from "@wodge/domain/pages";
import { useEffect, useRef } from "react";
import { Replicache } from "replicache";
import { useEditable } from "use-editable";
import { MemberMultiSelect } from "./member-multi-select";
import { DateTimePicker } from "./date-time-picker";
import { PriorityDropdown } from "./priority-dropdown";
import { SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import OfflineEditor from "../../block-editor/offline-editor";
import { useThreadEditor } from "@/hooks/use-thread-editor";
import { useAtomValue } from "jotai";
import { isSidebarOpenAtom } from "@/store/global-atoms";
import { useDebounce, useDebouncedCallback } from "use-debounce";
import { toast } from "sonner";
import { useTask } from "./task-provider";
import { DateRange } from "react-day-picker";
interface TaskSheetProps {
  task: Task;
  rep?: Replicache<typeof pageMutators>;
}

export function TaskSheet({ task, rep }: TaskSheetProps) {
  const { setTitle, title } = useTask();

  const titleRef = useRef<HTMLParagraphElement>(null);

  const editor = useThreadEditor({
    content: task?.overview,
    placeholder: "Type / for commands",
  });

  const isSidebarOpen = useAtomValue(isSidebarOpenAtom);

  const [debouncedEditor] = useDebounce(editor?.state.doc.content, 500, {});

  useEffect(() => {
    if (debouncedEditor && editor?.getHTML() !== task?.overview) {
      onEdit({ overview: editor?.getHTML() });
    }
  }, [debouncedEditor]);

  useEditable(titleRef, (t) => {
    setTitle(t);
    onEdit({ title: t });
  });

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
    } catch (e) {
      toast.error("Failed to edit task");
    }
  }

  return (
    <SheetContent
      className={cn(
        "flex w-full flex-col gap-0 px-0 pb-0 pt-10 sm:w-3/4 sm:max-w-full md:w-3/5  lg:max-w-[31.25rem] 2xl:max-w-[46.875rem]",
        isSidebarOpen && " sm:max-w-[calc(100vw-15rem)]",
      )}
    >
      <SheetHeader
        className="relative"
        onClick={() => {
          // focusElement(titleRef);
          titleRef?.current?.focus();
        }}
      >
        <SheetTitle
          ref={titleRef}
          className={cn(
            "mb-2 h-8 w-full px-6 text-left text-2xl focus:outline-none",

            !title && "text-muted-foreground",
          )}
          suppressContentEditableWarning
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") return;
          }}
          // onBlur={() => {
          //   onEdit({ title });
          // }}
        >
          {title}
        </SheetTitle>

        {!title && (
          <p className="absolute -top-2 left-6 text-2xl font-semibold text-muted-foreground ">
            Untitled
          </p>
        )}
      </SheetHeader>

      <div className="flex flex-col gap-1 px-3">
        <MemberMultiSelect
          bigger
          value={task?.assignee || []}
          setValue={(v) => {
            // setAssignee(v);
            onEdit({ assignee: v as string[] });
          }}
          isEditing
        />

        <DateTimePicker
          bigger
          onSetDate={(d) => {
            // setDue(d);
            onEdit({ due: d as Task["due"] });
          }}
          setIncludeTime={(t) => {
            // setIncludeTime(t);
            onEdit({}, t);
          }}
          date={task?.due as DateRange | undefined}
          isEditing
          includeTime={task?.includeTime}
        />
        <PriorityDropdown
          bigger
          priority={task?.priority}
          isEditing
          onSelect={(p) => {
            // setPriority(p);
            onEdit({ priority: p });
          }}
        />
      </div>

      <p className="px-6 pb-2 pt-6 text-sm font-medium text-muted-foreground">
        Task overview
      </p>

      <div className="overflow-y-auto">
        <div className="px-6">
          <OfflineEditor editor={editor} className="z-50 pl-0.5" isThread />
        </div>
      </div>
    </SheetContent>
  );
}

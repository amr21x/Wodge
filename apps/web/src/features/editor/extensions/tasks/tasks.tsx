import type { ComponentProps } from "react";
import { FeatureGate } from "@/components/feature-flags-provider";
import { useState } from "react";

import { Editor, NodeViewWrapper, NodeViewWrapperProps } from "@tiptap/react";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useAtom, useAtomValue } from "jotai";
import {
  assigneesAtom,
  dbsViewsAtom,
  dueAtom,
  includeTimeAtom,
  priorityAtom,
  titleAtom,
} from "./atom";
import { KanbanView } from "./kanban-view";

import { Button } from "@/components/ui/button";
import { KanbanIcon, ListFilter, Table, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { MemberMultiSelect } from "./member-multi-select";
import { DateTimePicker } from "./date-time-picker";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils/index";
import { Toggle } from "@/components/ui/toggle";
import { DbProvider } from "./db-provider";
import { useParams } from "next/navigation";
import { TableView } from "./table-view";

function TasksContent({ editor }: NodeViewWrapperProps) {
  return (
    <NodeViewWrapper className="select-none">
      <DbProvider>
        <TasksHeader />
        <KanbanWrapper editor={editor} />
        <TableWrapper editor={editor} />
      </DbProvider>
    </NodeViewWrapper>
  );
}

function TasksHeader() {
  const { channelId } = useParams<{ channelId: string }>();
  const [dbsViews, setDbsViews] = useAtom(dbsViewsAtom);
  const dbView = dbsViews[channelId] || "kanban";

  const [priority, setPriority] = useAtom(priorityAtom);
  const [title, setTitle] = useAtom(titleAtom);
  const [assignees, setAssignees] = useAtom(assigneesAtom);
  const [due, setDue] = useAtom(dueAtom);
  const [includeTime, setIncludeTime] = useAtom(includeTimeAtom);

  const [isFilterOpen, setIsFilterOpen] = useState(false);

  return (
    <>
      <div className="flex w-full items-center gap-2 pb-2">
        <ToggleGroup
          defaultValue={dbView || "kanban"}
          value={dbView || "kanban"}
          onValueChange={(v) =>
            setDbsViews({
              ...dbsViews,
              [channelId]: v as "kanban" | "table",
            })
          }
          type="single"
        >
          <ToggleGroupItem
            variant="outline"
            size="sm"
            value="kanban"
            aria-label="Kanban view"
          >
            <KanbanIcon className="size-4" />
          </ToggleGroupItem>
          <ToggleGroupItem
            value="table"
            size="sm"
            variant="outline"
            aria-label="Table view"
          >
            <Table className="size-4" />
          </ToggleGroupItem>
        </ToggleGroup>

        <Popover>
          <PopoverTrigger asChild></PopoverTrigger>

          <PopoverContent></PopoverContent>
        </Popover>

        <Toggle
          size="sm"
          variant="outline"
          pressed={isFilterOpen}
          onPressedChange={setIsFilterOpen}
          aria-label="Filter tasks"
        >
          <ListFilter
            className={cn(
              "size-4",
              (title || priority || assignees.length || due) &&
                "text-blue-500 dark:text-blue-600",
            )}
          />
        </Toggle>
      </div>

      <div
        className={cn(
          "invisible flex h-0 w-full items-center gap-2 overflow-x-auto",
          isFilterOpen && "visible h-[calc(100%)] pb-3 pt-1",
        )}
      >
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          className="shrink-0 basis-52 md:flex-1 md:basis-auto"
        />

        <DateTimePicker
          isFilter
          isEditing
          date={due}
          onSetDate={setDue}
          includeTime={includeTime}
          setIncludeTime={setIncludeTime}
        />

        <Select value={priority} onValueChange={setPriority}>
          <SelectTrigger className="shrink-0 basis-52 md:flex-1 md:basis-auto">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
          </SelectContent>
        </Select>

        <MemberMultiSelect
          setValue={setAssignees}
          value={assignees}
          isEditing
          icon={false}
        />

        <Button
          disabled={!title && !priority && !assignees.length && !due}
          className="shrink-0 px-1.5"
          onClick={() => {
            setTitle("");
            setPriority("");
            setAssignees([]);
            setDue(undefined);
          }}
          variant="outline"
          size="sm"
        >
          <X className="size-4 shrink-0" />
        </Button>
      </div>
    </>
  );
}

function KanbanWrapper({ editor }: { editor: Editor }) {
  const dbsViews = useAtomValue(dbsViewsAtom);

  const { channelId } = useParams<{ channelId: string }>();

  const dbView = dbsViews[channelId] || "kanban";

  if (dbView !== "kanban") {
    return null;
  }

  return <KanbanView editor={editor} />;
}

function TableWrapper({ editor }: { editor: Editor }) {
  const dbsViews = useAtomValue(dbsViewsAtom);

  const { channelId } = useParams<{ channelId: string }>();

  const dbView = dbsViews[channelId] || "kanban";

  if (dbView !== "table") {
    return null;
  }

  return <TableView editor={editor} />;
}

// const [priority, setPriority] = useState("");
// const [title, setTitle] = useState("");
// const [assignees, setAssignees] = useState<string[]>([]);
// const [due, setDue] = useState<DateRange>();
// const [includeTime, setIncludeTime] = useState(false);
// const [isFilterOpen, setIsFilterOpen] = useState(false);

// const [boardViewAtom, setBoardViewAtom] = useAtom(dbsViewsAtom);

// const boardId = useRef(node.attrs["data-id"]).current;

// const board = useMemo(() => {
//   console.log("fetching boards");
//   return boards?.find((b) => b.id === boardId);
// }, [boards]);

// const boardView = boardViewAtom[boardId] || "kanban";

{
  /* <div className="flex w-full items-center gap-2 pb-2">
        <ToggleGroup
          defaultValue={boardView || "kanban"}
          value={boardView || "kanban"}
          onValueChange={(v) =>
            setBoardViewAtom({
              ...boardViewAtom,
              [boardId]: v as "kanban" | "table",
            })
          }
          type="single"
        >
          <ToggleGroupItem variant="outline" size="sm" value="kanban">
            <KanbanIcon className="size-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="table" size="sm" variant="outline">
            <Table className="size-4" />
          </ToggleGroupItem>
        </ToggleGroup>

        <Popover>
          <PopoverTrigger asChild></PopoverTrigger>

          <PopoverContent></PopoverContent>
        </Popover>

        <Toggle
          size="sm"
          variant="outline"
          pressed={isFilterOpen}
          onPressedChange={setIsFilterOpen}
        >
          <ListFilter
            className={cn(
              "size-4",
              (title || priority || assignees.length || due) &&
                "text-blue-500 dark:text-blue-600",
            )}
          />
        </Toggle>
      </div>

      <div
        className={cn(
          "invisible flex h-0 items-center gap-2",
          isFilterOpen && "visible h-[calc(100%)] pb-2 pt-1",
        )}
      >
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
        />

        <DateTimePicker
          isFilter
          isEditing
          date={due}
          onSetDate={setDue}
          includeTime={includeTime}
          setIncludeTime={setIncludeTime}
        />

        <Select value={priority} onValueChange={setPriority}>
          <SelectTrigger>
            <SelectValue placeholder="Priority" />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
          </SelectContent>
        </Select>

        <MemberMultiSelect
          preset={assignees}
          isEditing
          onChange={setAssignees}
          icon={false}
        />

        <Button
          disabled={!title && !priority && !assignees.length && !due}
          className="px-1.5"
          onClick={() => {
            setTitle("");
            setPriority("");
            setAssignees([]);
            setDue(undefined);
          }}
          variant="outline"
          size="sm"
        >
          <X className="size-4" />
        </Button>
      </div>

      {boardView === "kanban" && (
        <KanbanView
          board={board as Board}
          editor={editor}
          boardId={boardId}
          rep={rep}
          priority={priority}
          title={title}
          assignees={assignees}
          due={due}
        />
      )}
      {boardView === "table" && (
        <TableView
          board={board as Board}
          rep={rep}
          boardId={boardId}
          editor={editor}
          priority={priority}
          title={title}
          assignees={assignees}
          due={due}
        />
      )} */
}

export function Tasks(props: ComponentProps<typeof TasksContent>) {
  return (
    <FeatureGate feature="tasks">
      <TasksContent {...props} />
    </FeatureGate>
  );
}

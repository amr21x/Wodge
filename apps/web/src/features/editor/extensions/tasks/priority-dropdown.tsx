import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils/index";
import { ChevronUpCircle, X } from "lucide-react";

import { Task } from "@wodge/domain/pages/models";

import { Badge } from "@/components/ui/badge";

export function PriorityDropdown({
  priority,
  onSelect,
  bigger,
  isEditing,
}: {
  priority?: Task["priority"];
  bigger?: boolean;
  isEditing?: boolean;
  onSelect?: (priority?: "low" | "medium" | "high") => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div
          className={cn(
            buttonVariants({ variant: "ghost", size: bigger ? "sm" : "fit" }),
            "justify-start gap-2 text-sm aria-disabled:opacity-85",
            !priority && "text-muted-foreground",
            priority && "group/priority gap-1 text-foreground opacity-100",
            bigger && "text-sm",
          )}
          aria-disabled={!isEditing}
        >
          {bigger && (
            <div className="flex w-36 items-center gap-2">
              <ChevronUpCircle className="h-4 w-4 text-foreground" />
              Add Priority
            </div>
          )}

          {!priority && (
            <>
              {!bigger && (
                <ChevronUpCircle className="h-4 w-4 text-foreground" />
              )}
              <span>{bigger ? "Empty" : "Add Priority"}</span>
            </>
          )}

          {priority && <Priority priority={priority} />}
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={bigger ? "center" : "start"} className="w-44">
        <DropdownMenuItem
          className="group/priority"
          onClick={() => onSelect?.("low")}
        >
          <Priority priority="low" />
        </DropdownMenuItem>
        <DropdownMenuItem className="" onClick={() => onSelect?.("medium")}>
          <Priority priority="medium" />
        </DropdownMenuItem>
        <DropdownMenuItem className="" onClick={() => onSelect?.("high")}>
          <Priority priority="high" />
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => onSelect?.(undefined)}
          disabled={!priority}
        >
          <X className="h-4 w-4" />
          Remove Priority
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Priority({ priority }: { priority: "low" | "medium" | "high" }) {
  return (
    <Badge
      className={cn(
        "justify-between gap-1 capitalize",
        priority === "low" && "bg-green-600 text-green-50 dark:bg-green-700",
        priority === "medium" &&
          "bg-yellow-600 text-yellow-50 dark:bg-yellow-700",
        priority === "high" && "bg-red-600 text-red-50 dark:bg-red-700",
      )}
    >
      {priority}
    </Badge>
  );
}

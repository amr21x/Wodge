import { PublicUserType } from "@wodge/domain/user/models";
import { ThreadMessage } from "@wodge/domain/discussions/models";
import { cn } from "@/lib/utils/index";
import { format } from "date-fns";
import { CheckCircle2, CircleDot } from "lucide-react";

export function ThreadAction({
  comment,
  member,
  isFirst,
}: {
  comment: ThreadMessage;
  member?: PublicUserType;
  isFirst?: boolean;
}) {
  const Icon = comment.type === "open" ? CircleDot : CheckCircle2;

  return (
    <div className="z-50 flex items-center gap-3 truncate pl-[0.5625rem] text-sm">
      <Icon
        className={cn(
          "h-6 w-6 shrink-0 rounded-full border-2 border-background p-0.5",
          comment.type === "open"
            ? "bg-green-600 text-green-50 dark:bg-green-500"
            : "bg-purple-600 text-purple-50 dark:bg-purple-500",
        )}
      />
      <div className="flex gap-1">
        <p>@{member?.username || "workspace_member"}</p>
        <p className="truncate text-muted-foreground">
          {comment.type === "open"
            ? isFirst
              ? "opened"
              : "reopened"
            : "closed"}{" "}
          the thread
        </p>
        <p className="truncate pt-0.5 text-xs text-muted-foreground">
          {comment.createdAt && format(comment.createdAt, "yyyy/MM/dd h:mm a")}
        </p>
      </div>
    </div>
  );
}

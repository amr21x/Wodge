import {
  Thread,
  ThreadMessage as ThreadMessageType,
  ThreadPost,
} from "@wodge/data";
import { useMember } from "@/hooks/use-member";
import { ThreadAction } from "./thread-actions";
import { format } from "date-fns";
import { SafeAvatar } from "@/components/safe-avatar";

import { ThreadDropDown } from "../../thread-dropdown";
import { SafeDiv } from "@/components/safe-div";
import { useIsTeamModerator } from "@/hooks/use-is-team-moderator";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useEditEditor } from "./use-edit-editor";
import { EditEditor } from "./edit-editor";

export function ThreadMessage({
  comment,
  type,
  isResolved,
  onDeleteMsg,
  onEditMsg,
}: {
  comment: ThreadMessageType;
  type: ThreadPost["type"];
  isResolved?: boolean;
  onDeleteMsg?: (comment: ThreadMessageType) => void;
  onEditMsg?: (comment: ThreadMessageType, content: string) => Promise<void>;
}) {
  const { member } = useMember(comment.author);
  const { user } = useCurrentUser();

  const isPrivileged = useIsTeamModerator();

  const { isEditing, setIsEditing, onCancelEdit, onEdit } = useEditEditor();

  if (comment.type === "open" || comment.type === "close")
    return <ThreadAction comment={comment} member={member} />;

  return (
    <div className="group flex flex-col items-start rounded-md border border-border/50 bg-dim px-2 py-4">
      <div className="flex w-full items-start gap-2">
        <SafeAvatar
          src={member?.avatar}
          fallback={member?.displayName[0] || "W"}
          className="h-7 w-7"
        />

        <div className="flex w-full items-center gap-2">
          <p className="text-sm">{member?.displayName || "Workspace Member"}</p>
          <p className="pt-0.5 text-xs text-muted-foreground">
            {format(comment.createdAt, "yyyy/MM/dd h:mm a")}
          </p>
        </div>

        <ThreadDropDown
          label={type === "post" ? "comment" : "answer"}
          onEdit={onEdit}
          onDelete={() => onDeleteMsg?.(comment as ThreadMessageType)}
          canDelete={
            !isResolved && (comment.author === user?.id || isPrivileged)
          }
          canEdit={!isResolved && comment.author === user?.id}
        />
      </div>

      {isEditing ? (
        <div className="w-full pl-9">
          <EditEditor
            content={comment}
            onCancelEdit={onCancelEdit}
            onSuccessEdit={async (text: string) => {
              await onEditMsg?.(comment, text);
              setIsEditing(false);
            }}
          />
        </div>
      ) : (
        <SafeDiv
          className="BlockEditor w-full overflow-hidden text-balance break-words pl-9"
          html={comment.content}
        />
      )}
    </div>
  );
}

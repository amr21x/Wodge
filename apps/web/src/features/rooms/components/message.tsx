import { useMember } from "@/features/workspace/hooks/use-member";
import { differenceInMinutes, format } from "date-fns";
import { DrObj } from "@wodge/domain/types";
import { Message as MessageType } from "@wodge/domain/rooms/models";
import React, { memo, useRef } from "react";
import { SafeAvatar } from "@/components/safe-avatar";
import { SafeDiv } from "@/components/safe-div";
import { ImageMessage } from "./image-message";
import { AudioMessage } from "./audio-message";
import { FileMessage } from "./file-message";
import { VideoMessage } from "./video-message";
import { MessageDropDown } from "./message-dropdown";
import { useCurrentUser } from "@/features/account/hooks/use-current-user";
import { useIsTeamModerator } from "@/features/workspace/hooks/use-is-team-moderator";
import { useEditEditor } from "../../discussions/components/use-edit-editor";
import { EditEditor } from "./edit-editor";
import { cn } from "@/lib/utils/index";
import PollUI from "@/features/polls/components/poll";

export const Message = memo(
  ({
    message,
    workspaceId,
    prevMsg,
    onDelete,
    onSuccessEdit,
  }: {
    message: MessageType | DrObj<MessageType>;
    workspaceId: string;
    prevMsg?: MessageType | DrObj<MessageType>;
    onDelete?: (msg: MessageType) => Promise<void>;
    onSuccessEdit?: (msg: MessageType, newContent: string) => Promise<void>;
  }) => {
    const { member, isMembersPending } = useMember(message.sender);

    const { user } = useCurrentUser();

    const isTeamModerator = useIsTeamModerator();

    const { isEditing, onCancelEdit, onEdit, setIsEditing } = useEditEditor();

    if (isMembersPending) {
      return null;
    }

    const isHeaderHideable =
      !!prevMsg &&
      prevMsg.sender === message.sender &&
      differenceInMinutes(message.date, prevMsg.date) < 5;

    if (isHeaderHideable) {
      return (
        <div className="group w-full rounded-md transition-all hover:bg-secondary/40">
          <div className="relative flex px-1.5 py-0.5">
            <p
              className={cn(
                "invisible absolute left-1 top-1/2 -translate-y-1/2 text-xs text-muted-foreground transition-all group-hover:visible",
                isEditing && "top-0 translate-y-1/2",
              )}
            >
              {format(message.date, "HH:mm")}
            </p>

            <div className="MessageEditor w-full overflow-hidden text-balance break-words pl-9">
              {isEditing ? (
                <EditEditor
                  content={message as MessageType}
                  onCancelEdit={() => onCancelEdit()}
                  onSuccessEdit={(newContent) => {
                    onSuccessEdit?.(message as MessageType, newContent);
                    setIsEditing(false);
                  }}
                />
              ) : (
                <Content m={message} workspaceId={workspaceId} />
              )}
            </div>

            <MessageDropDown
              canEdit={user?.id === message.sender && message.type === "text"}
              canDelete={isTeamModerator || user?.id === message.sender}
              onDelete={() => {
                onDelete?.(message as MessageType);
              }}
              onEdit={() => {
                setIsEditing(true);
              }}
              isPoll={message.type === "poll"}
            />
          </div>
        </div>
      );
    }

    return (
      <div className="group rounded-md p-1.5 transition-all hover:bg-secondary/40">
        <div className="flex items-start gap-2">
          <SafeAvatar
            className="h-7 w-7"
            src={member?.avatar}
            fallback={member?.displayName}
          />

          <div className="flex items-center gap-2">
            <p className="text-sm">{member?.displayName}</p>
            <p className="align-self-start pt-0.5 text-xs text-muted-foreground">
              {format(message.date, "yyyy/MM/dd HH:mm")}
            </p>
          </div>

          <MessageDropDown
            canEdit={user?.id === message.sender && message.type === "text"}
            canDelete={isTeamModerator || user?.id === message.sender}
            onDelete={() => {
              onDelete?.(message as MessageType);
            }}
            onEdit={() => {
              setIsEditing(true);
            }}
            isPoll={message.type === "poll"}
          />
        </div>
        <div className="pl-9">
          {isEditing ? (
            <EditEditor
              content={message as MessageType}
              onCancelEdit={() => onCancelEdit()}
              onSuccessEdit={(newContent) => {
                onSuccessEdit?.(message as MessageType, newContent);
                setIsEditing(false);
              }}
            />
          ) : (
            <Content m={message} workspaceId={workspaceId} />
          )}
        </div>
      </div>
    );
  },
);

function Content({
  m,
  workspaceId,
}: {
  m: DrObj<MessageType>;
  workspaceId: string;
}) {
  return (
    <>
      {m.type === "poll" && (
        <>
          <SafeDiv
            className="BlockEditor w-full overflow-hidden text-balance break-words"
            html={m.content}
          />
          <span className="py-2 text-sm text-muted-foreground">
            Poll - select one answer
          </span>
          <PollUI
            options={(m.pollOptions as string[]) || []}
            votes={(m.votes as number[]) || []}
            pollVoters={(m.pollVoters as MessageType["pollVoters"]) || []}
            id={m.id}
            isRoom
          />
        </>
      )}
      {m.type === "text" && (
        <SafeDiv
          className="MessageEditor mr-1 overflow-hidden text-balance break-words"
          html={m.content}
        />
      )}
      {m.type === "image" && (
        <ImageMessage message={m} workspaceId={workspaceId} />
      )}
      {m.type === "audio" && (
        <AudioMessage message={m} workspaceId={workspaceId} />
      )}
      {m.type === "file" && (
        <FileMessage message={m} workspaceId={workspaceId} />
      )}
      {m.type === "video" && (
        <VideoMessage message={m} workspaceId={workspaceId} />
      )}
    </>
  );
}

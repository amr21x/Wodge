import { atom } from "jotai";
import { Message } from "./message";
import { memo, useEffect, useRef } from "react";
import { Message as MessageType } from "@wodge/domain/rooms/models";
import type { RoomMutators } from "@/client/sync/rooms/mutators";
import { ReadTransaction, Replicache } from "replicache";
import { useSubscribe } from "@/client/sync/use-subscribe";
import { useCurrentWorkspace } from "@/features/workspace/state/workspace-provider";
import { useParams } from "next/navigation";
import { toast } from "sonner";

export const lastSenderIdAtom = atom<string>("");

export const MessageList = memo(
  ({ rep }: { rep?: Replicache<RoomMutators> }) => {
    const { snapshot: messages } = useSubscribe(rep, (tx: ReadTransaction) =>
      tx.get<MessageType[]>("messages"),
    );

    const { workspaceId } = useCurrentWorkspace();
    useParams<{
      teamId: string;
      channelId: string;
    }>();

    const listRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      if (listRef.current) {
        listRef.current.scrollIntoView({
          block: "end",
        });
      }
    }, [messages]);

    async function onDelete(msg: MessageType) {
      try {
        await rep?.mutate.deleteMessage(msg);
      } catch {
        toast.error("Message deletion failed");
      }
    }

    async function onEdit(msg: MessageType, newContent: string) {
      try {
        await rep?.mutate.editMessage({ message: msg, newContent });
      } catch {
        toast.error("Message edition failed");
      }
    }

    if (!workspaceId) {
      return null;
    }

    if (!messages || messages.length === 0) {
      return null;
    }

    return (
      <div className="flex flex-col" ref={listRef}>
        {messages?.map((m, i) => {
          return (
            <Message
              message={m}
              key={m.id}
              prevMsg={messages[i - 1]}
              workspaceId={workspaceId}
              onDelete={onDelete}
              onSuccessEdit={onEdit}
            />
          );
        })}
      </div>
    );
  },
);

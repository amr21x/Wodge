import { atom, useAtomValue, useSetAtom } from "jotai";
import { Message } from "./message";
import { memo, useEffect, useLayoutEffect, useRef } from "react";
import { Message as MessageType } from "@wodge/data";
import { roomMutators } from "@wodge/data/browser";
import { ReadTransaction, Replicache } from "replicache";
import { useSubscribe } from "@/hooks/use-subscribe";
import { useCurrentWorkspace } from "@/components/workspace-provider";
import { useParams } from "next/navigation";
import { toast } from "sonner";

export const lastSenderIdAtom = atom<string>("");

export const MessageList = memo(
  ({ rep }: { rep?: Replicache<typeof roomMutators> }) => {
    const { snapshot: messages } = useSubscribe(rep, (tx: ReadTransaction) =>
      tx.get<MessageType[]>("messages"),
    );

    const { workspaceId } = useCurrentWorkspace();
    const { teamId, channelId } = useParams<{
      teamId: string;
      channelId: string;
    }>();

    const listRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      if (listRef.current)
        listRef.current.scrollIntoView({
          block: "end",
        });
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

    if (!workspaceId) return null;

    if (!messages || messages.length === 0) return null;

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

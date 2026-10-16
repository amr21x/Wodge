import {
  Thread,
  ThreadMessage as ThreadMessageType,
  ThreadPost,
} from "@wodge/data";
import { threadMutators } from "@wodge/data/browser";
import { memo, useEffect } from "react";
import { ReadTransaction, Replicache } from "replicache";
import { useSubscribe } from "@/hooks/use-subscribe";
import { ThreadMessage } from "./thread-message";
import { toast } from "sonner";

export const ThreadMessagesList = memo(
  ({
    rep,
    comments,
    post,
    isQA = false,
  }: {
    rep?: Replicache<typeof threadMutators>;
    comments?: ThreadMessageType[];
    post?: ThreadPost;
    isQA?: boolean;
  }) => {
    async function onDeleteMsg(comment: ThreadMessageType) {
      try {
        if (!post) return;
        await rep?.mutate.deleteComment({
          ...comment,
          postId: post?.id,
        });
      } catch {
        toast.error("Delete comment failed");
      }
    }

    async function onEditMsg(comment: ThreadMessageType, newContent: string) {
      try {
        if (!post) return;
        await rep?.mutate.editComment({
          comment,
          postId: post?.id,
          newContent,
        });
      } catch {
        toast.error("Edit comment failed");
      }
    }

    if (!comments) return null;

    return (
      <div className={!isQA ? "" : "mb-2.5"}>
        {!isQA && comments.length > 0 && (
          <p className="py-2.5 text-sm font-medium text-muted-foreground">
            Comments
          </p>
        )}

        <div className="flex flex-col gap-2.5">
          {comments?.map((m) => (
            <ThreadMessage
              type={isQA ? "qa" : "post"}
              comment={m}
              key={m.id}
              onDeleteMsg={onDeleteMsg}
              onEditMsg={onEditMsg}
              isResolved={post?.isResolved}
            />
          ))}
        </div>
      </div>
    );
  },
);

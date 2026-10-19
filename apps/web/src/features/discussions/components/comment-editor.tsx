import type { ThreadMutators } from "@/client/sync/discussions/mutators";
import { SafeAvatar } from "@/components/safe-avatar";
import { TooltipWrapper } from "@/components/tooltip-wrapper";
import { useCurrentUser } from "@/features/account/hooks/use-current-user";
import { useThreadEditor } from "@/features/discussions/hooks/use-thread-editor";
import OfflineEditor from "@/features/editor/block-editor/offline-editor";
import { SidebarItemBtn } from "@/features/workspace/components/sidebar-item-btn";
import { createEntityId } from "@wodge/domain/identifiers";
import { Send } from "lucide-react";
import { useParams } from "next/navigation";
import { Replicache } from "replicache";
import { toast } from "sonner";

export function CommentEditor({
  rep,
  isQA,
  isResolved,
}: {
  rep?: Replicache<ThreadMutators>;
  isQA?: boolean;
  isResolved?: boolean;
}) {
  const { user } = useCurrentUser();

  const editor = useThreadEditor({
    placeholder: isQA ? "Add an answer..." : "Add a comment...",
  });

  const { postId } = useParams<{ postId: string }>();

  async function createComment() {
    const text = editor?.getHTML();

    if (!text || !user) {
      return;
    }

    try {
      await rep?.mutate.createComment({
        author: user.id,
        content: text,
        createdAt: new Date().toISOString(),
        id: createEntityId(),
        type: "message",
        postId,
      });

      editor?.commands.clearContent();
    } catch {
      toast.error("Send comment failed");
    }
  }

  return (
    <div className="flex w-full items-center gap-2 rounded-md border border-border/50 bg-secondary/40 px-1.5 py-1.5">
      {!isResolved && (
        <>
          <div
            className="flex h-full w-full items-center"
            onKeyDown={(e) => {
              if (e.key === "Enter" && e.ctrlKey) {
                createComment();
              }
            }}
          >
            <SafeAvatar
              src={user?.avatar}
              className="mr-3 h-6 w-6 self-start"
              fallback={user?.displayName?.[0]}
            />
            <OfflineEditor editor={editor} isThread className="flex-1" />
            <TooltipWrapper content={isQA ? "Send answer" : "Send comment"}>
              <SidebarItemBtn
                Icon={Send}
                className="self-start"
                onClick={createComment}
              />
            </TooltipWrapper>
          </div>
        </>
      )}
      {isResolved && (
        <p className="text-sm text-muted-foreground">Thread is resolved</p>
      )}
    </div>
  );
}

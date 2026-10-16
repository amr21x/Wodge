import { SidebarItemBtn } from "@/app/(workspaces)/[workspaceSlug]/(workspace)/_components/sidebar-item-btn";
import { SafeAvatar } from "@/components/safe-avatar";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useCurrentWorkspace } from "@/components/workspace-provider";
import { useIsTeamModerator } from "@/hooks/use-is-team-moderator";
import { cn } from "@/lib/utils";
import { Image, Vote } from "lucide-react";
import { nanoid } from "nanoid";
import { useParams } from "next/navigation";
import { memo } from "react";
import { useThreadEditor } from "@/hooks/use-thread-editor";
import OfflineEditor from "@/components/editor/block-editor/offline-editor";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { PollMaker } from "@/components/poll-maker";
import { Replicache } from "replicache";
import { threadMutators } from "@wodge/data/browser";
import { toast } from "sonner";

export function ThreadEditor({
  isQA = false,
  isComment = false,
  rep,
}: {
  isQA?: boolean;
  isComment?: boolean;
  rep?: Replicache<typeof threadMutators>;
}) {
  const { workspaceRep } = useCurrentWorkspace();
  const { user } = useCurrentUser();
  const { teamId } = useParams<{ teamId: string }>();

  const editor = useThreadEditor({
    placeholder: isQA ? "What's your question?" : "What's happening?",
  });

  const isPrivileged = useIsTeamModerator();

  const { postId } = useParams<{ postId: string }>();

  async function createThread() {
    const text = editor?.getHTML();
    try {
      if (!text || !user) return;
      if (isComment) {
        if (!postId) return;
        await rep?.mutate.createComment({
          author: user.id,
          content: text,
          id: nanoid(6),
          createdAt: new Date().toISOString(),
          postId,
          type: "message",
        });
      } else {
        await rep?.mutate.createPost({
          author: user.id,
          comments: [],
          content: text,
          createdAt: new Date().toISOString(),
          id: nanoid(6),
          pollOptions: [],
          pollVoters: [],
          type: isQA ? "qa" : "post",
          votes: [],
        });
      }

      editor?.commands.clearContent();
    } catch {
      toast.error("Create post failed");
    }
  }

  return (
    <div
      className={cn(
        "flex shrink-0 flex-col rounded-md border border-border/50 bg-secondary/40 px-1.5 pb-1 pt-2.5",

        !isQA && !isPrivileged && "pt-1",
      )}
    >
      {!isQA && !isPrivileged && (
        <p className="text-muted-foreground">
          Only owner, admins, and moderators can post.
        </p>
      )}

      {(isQA || (!isQA && isPrivileged)) && (
        <>
          <div
            className="flex h-full w-full items-start"
            onKeyDown={(e) => {
              if (e.key === "Enter" && e.ctrlKey) {
                createThread();
              }
            }}
          >
            <SafeAvatar
              src={user?.avatar}
              className="mr-3 h-7 w-7"
              fallback={user?.displayName?.[0]}
            />
            <OfflineEditor editor={editor} isThread className="w-full" />
          </div>
          <div className="ml-0.5 flex items-center py-1.5 pl-8">
            <SidebarItemBtn
              className="p-1.5"
              Icon={Image}
              iconClassName="w-4 h-4 "
              onClick={() => {
                editor?.commands.setImageUpload();
              }}
            />
            {!isQA && (
              <Dialog>
                <DialogTrigger asChild>
                  <SidebarItemBtn
                    className="p-1.5"
                    Icon={Vote}
                    iconClassName="w-4 h-4"
                  />
                </DialogTrigger>
                <DialogContent>
                  <PollMaker isRoom={false} />
                </DialogContent>
              </Dialog>
            )}
            <SubmitButton
              isEmpty={editor?.isEmpty}
              createThread={createThread}
              isQA={isQA}
            />
          </div>
        </>
      )}
    </div>
  );
}

const SubmitButton = memo(
  ({
    isEmpty = true,
    createThread,
    isQA,
  }: {
    isEmpty?: boolean;
    isQA?: boolean;
    createThread: () => void;
  }) => {
    return (
      <Button
        size="fit"
        className="ml-auto w-20"
        disabled={isEmpty}
        onClick={createThread}
      >
        {isQA ? "Ask" : "Post"}
      </Button>
    );
  },
);

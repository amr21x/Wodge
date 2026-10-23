import { ThreadMessage, ThreadPost } from "@wodge/domain/discussions/models";
import type { ThreadMutators } from "@/client/sync/discussions/mutators";
import { format } from "date-fns";
import { SafeDiv } from "../../../components/safe-div";
import { useMember } from "@/features/workspace/hooks/use-member";
import { SafeAvatar } from "@/components/safe-avatar";

import { useParams, useRouter } from "next/navigation";
import { memo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThreadDropDown } from "./thread-dropdown";
import { EditEditor } from "./edit-editor";
import { useCurrentUser } from "@/features/account/hooks/use-current-user";
import { useIsTeamModerator } from "@/features/workspace/hooks/use-is-team-moderator";
import { useEditEditor } from "./use-edit-editor";
import { cn } from "@/lib/utils/index";
import { CheckCircle2, CircleDot, MessageCircle } from "lucide-react";

import PollUI from "@/features/polls/components/poll";
import { Replicache } from "replicache";
import { toast } from "sonner";

export const Post = memo(
  ({
    post,
    comment,
    opened = false,
    isQA = false,
    isComment = false,
    rep,
  }: {
    post?: ThreadPost;
    comment?: ThreadMessage;
    opened?: boolean;
    isQA?: boolean;
    isComment?: boolean;
    rep?: Replicache<ThreadMutators>;
  }) => {
    const { teamId, workspaceSlug } = useParams<{
      teamId: string;
      workspaceSlug: string;
    }>();

    const { isEditing, setIsEditing, onCancelEdit, onEdit } = useEditEditor();

    const author = post?.author || comment?.author;
    const { member } = useMember(author);
    const { user } = useCurrentUser();
    const isPrivileged = useIsTeamModerator();
    const router = useRouter();

    const { channelId, postId } = useParams<{
      channelId: string;
      postId?: string;
    }>();

    const Icon = post?.isResolved ? CheckCircle2 : CircleDot;

    const commentsLength = post?.comments.length || 0;

    return (
      <div className="group overflow-hidden rounded-md border border-border/50 bg-dim">
        <div className="flex w-full flex-col items-start px-2 pb-2 pt-4">
          <div className="flex w-full items-start gap-2">
            <SafeAvatar
              src={member?.avatar}
              fallback={member?.displayName[0] || "W"}
              className="h-7 w-7 rounded-full"
            />

            <div className="flex items-center gap-2">
              <p className="text-sm">
                {member?.displayName || "Workspace Member"}
              </p>
              <p className="truncate pt-0.5 text-xs text-muted-foreground">
                {format(
                  post?.createdAt ||
                    comment?.createdAt ||
                    "2024-05-06T01:35:51.267Z",
                  "yyyy/MM/dd h:mm a",
                )}
              </p>

              {isQA && (
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0",
                    post?.isResolved
                      ? "text-purple-600 dark:text-purple-500"
                      : "text-green-600 dark:text-green-500",
                  )}
                />
              )}
            </div>

            <ThreadDropDown
              label={
                isQA ? "question" : post?.type === "poll" ? "poll" : "post"
              }
              onDelete={async () => {
                try {
                  if (!post && !comment) {
                    return;
                  }

                  if (comment) {
                    if (!postId) {
                      return;
                    }

                    await rep?.mutate.deleteComment({
                      ...comment,
                      postId: postId,
                    });
                  } else {
                    if (!post) {
                      return;
                    }

                    await rep?.mutate.deletePost({
                      ...post,
                    });
                  }

                  if (opened) {
                    router.replace(`/${workspaceSlug}/thread/${teamId}`);
                  }
                } catch {
                  toast.error("Deletion failed");
                }
              }}
              onEdit={onEdit}
              canEdit={author === user?.id}
              canDelete={author === user?.id || isPrivileged}
            />
          </div>

          {isEditing ? (
            <div className="w-full pl-9">
              <EditEditor
                content={post as ThreadPost}
                onCancelEdit={onCancelEdit}
                onSuccessEdit={async (text: string) => {
                  try {
                    if (!isComment) {
                      if (!post) {
                        return;
                      }

                      await rep?.mutate.editPost({
                        ...post,
                        newContent: text,
                      });
                    } else {
                      if (!comment) {
                        return;
                      }

                      await rep?.mutate.editComment({
                        comment,
                        newContent: text,
                        postId: comment.id,
                      });
                    }

                    setIsEditing(false);
                  } catch {
                    toast.error("Edit failed");
                  }
                }}
              />
            </div>
          ) : post?.type === "poll" ? (
            <>
              <SafeDiv
                className="BlockEditor w-full overflow-hidden text-balance break-words pl-9"
                html={post.content || ""}
              />
              <span className="py-2 pl-9 text-sm text-muted-foreground">
                Poll - select one answer
              </span>
              <PollUI
                isRoom={false}
                options={(post.pollOptions as string[]) || []}
                votes={(post.votes as number[]) || []}
                pollVoters={(post.pollVoters as ThreadPost["pollVoters"]) || []}
                id={post.id}
              />
            </>
          ) : (
            <div className="BlockEditor tiptap ProseMirror overflow-hidden">
              <SafeDiv
                className="tableWrapper w-full text-balance break-words pl-9"
                html={post?.content || comment?.content || ""}
              />
            </div>
          )}
        </div>

        {!opened && post?.type !== "poll" && (
          <Link
            href={`/${workspaceSlug}/thread/${teamId}/${channelId}/${isQA ? "thread" : "post"}/${post?.id || comment?.id}`}
          >
            <Button
              variant="ghost"
              size="fit"
              className="group/btn mb-4 ml-10 justify-start gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <MessageCircle className="h-4 w-4" />
              {commentsLength} comment{commentsLength === 1 ? "" : "s"}
              {/* <span className="opacity-50 transition-all group-hover/btn:opacity-100"> */}
              {/* </span> */}
            </Button>
          </Link>
        )}
      </div>
    );
  },
);

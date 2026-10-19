"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Post } from "./post";
import { Replicache } from "replicache";
import { ThreadMessage, ThreadPost } from "@wodge/domain/discussions/models";
import type { ThreadMutators } from "@/client/sync/discussions/mutators";
import { useChannelPath } from "@/features/workspace/hooks/use-channel-path";
import { CommentEditor } from "./comment-editor";
import { ThreadMessagesList } from "./thread-msgs-list";
import { useSubscribe } from "@/client/sync/use-subscribe";
import { useMemo } from "react";
import { useParams } from "next/navigation";

export function PostPage({ rep }: { rep?: Replicache<ThreadMutators> }) {
  const { postId } = useParams<{ postId: string }>();

  const { snapshot: posts } = useSubscribe(rep, (tx) =>
    tx.get<ThreadPost[]>("posts"),
  );

  const post = useMemo(() => posts?.find((p) => p.id === postId), [posts]);

  return (
    <div className="flex w-full flex-col gap-4 px-2 py-3">
      <Post post={post as ThreadPost | undefined} opened rep={rep} />
      <ThreadMessagesList
        post={post as ThreadPost}
        comments={post?.comments as ThreadMessage[]}
        rep={rep}
      />
      <CommentEditor rep={rep} />
    </div>
  );
}

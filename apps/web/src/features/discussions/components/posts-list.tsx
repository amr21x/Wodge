import { DrObj } from "@wodge/domain/types";
import { Team } from "@wodge/domain/workspace/models";
import { ThreadPost } from "@wodge/domain/discussions/models";
import type { ThreadMutators } from "@/client/sync/discussions/mutators";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TabsContent } from "@/components/ui/tabs";
import { useMemo } from "react";
import { Post } from "./post";
import { Replicache } from "replicache";
import { ThreadEditor } from "./thread-editor";

export function PostsList({
  posts,
  rep,
}: {
  posts?: DrObj<ThreadPost[]>;
  rep?: Replicache<ThreadMutators>;
}) {
  const postsList = useMemo(
    () => posts?.filter((p) => p.type === "post" || p.type === "poll"),
    [posts],
  );

  return (
    <div className="pb-4">
      <ThreadEditor rep={rep} />
      <div className="flex flex-col gap-2.5 py-4">
        {postsList?.map((post) => (
          <Post key={post.id} post={post as ThreadPost} rep={rep} />
        ))}
      </div>
    </div>
  );
}

import { DrObj } from "@wodge/domain/types";

import { ThreadPost } from "@wodge/domain/discussions/models";
import type { ThreadMutators } from "@/client/sync/discussions/mutators";

import { Post } from "./post";
import { useMemo } from "react";
import { Replicache } from "replicache";
import { ThreadEditor } from "./thread-editor";

export function QAsList({
  posts,
  rep,
}: {
  posts?: DrObj<ThreadPost[]>;
  rep?: Replicache<ThreadMutators>;
}) {
  const qas = useMemo(() => posts?.filter((p) => p.type === "qa"), [posts]);

  return (
    <div className="pb-4">
      <ThreadEditor isQA rep={rep} />
      <div className="flex flex-col gap-1.5 py-4">
        {qas?.map((post) => (
          <Post isQA key={post.id} post={post as ThreadPost} rep={rep} />
        ))}
      </div>
    </div>
  );
}

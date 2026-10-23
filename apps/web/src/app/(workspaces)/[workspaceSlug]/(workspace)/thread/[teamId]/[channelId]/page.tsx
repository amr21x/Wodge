"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCurrentWorkspace } from "@/features/workspace/state/workspace-provider";

import { useParams } from "next/navigation";

import { PostsList } from "../../../../../../../features/discussions/components/posts-list";
import { QAsList } from "../../../../../../../features/discussions/components/qas-list";
import { useSubscribe } from "@/client/sync/use-subscribe";
import { ReadTransaction } from "replicache";
import { ThreadPost } from "@wodge/domain/discussions/models";
import { useCurrentThreadRep } from "@/features/discussions/hooks/use-thread-rep";
import { useUpdateRecentlyVisited } from "@/features/workspace/hooks/use-recently-visited";

function ThreadsPage() {
  useUpdateRecentlyVisited("thread");

  useCurrentWorkspace();

  useParams<{ teamId: string }>();

  const rep = useCurrentThreadRep();

  const { snapshot: posts } = useSubscribe(rep, (tx: ReadTransaction) =>
    tx.get<ThreadPost[]>("posts"),
  );

  return (
    <div className="flex h-full w-full flex-col gap-4 px-2 py-3">
      <Tabs defaultValue="posts" className="h-full">
        <TabsList className="w-full">
          <TabsTrigger value="posts" className="w-full">
            Posts
          </TabsTrigger>
          <TabsTrigger value="qa" className="w-full">
            Q&A
          </TabsTrigger>
        </TabsList>
        <TabsContent value="posts">
          <PostsList rep={rep} posts={posts} />
        </TabsContent>

        <TabsContent value="qa">
          <QAsList rep={rep} posts={posts} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default ThreadsPage;

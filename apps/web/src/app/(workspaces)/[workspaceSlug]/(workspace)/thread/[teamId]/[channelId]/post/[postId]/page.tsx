"use client";

import { useCurrentThreadRep } from "@/features/discussions/hooks/use-thread-rep";

import { PostPage } from "../../../../../../../../../features/discussions/components/post-page";

function ChannelPage() {
  const rep = useCurrentThreadRep();

  return <PostPage rep={rep} />;
}

export default ChannelPage;

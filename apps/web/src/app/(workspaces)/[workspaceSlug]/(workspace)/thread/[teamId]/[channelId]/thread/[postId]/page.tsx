"use client";

import { useCurrentThreadRep } from "@/features/discussions/hooks/use-thread-rep";

import { QAPage } from "../../../../../../../../../features/discussions/components/qa-page";

function ChannelPage() {
  const rep = useCurrentThreadRep();

  return <QAPage rep={rep} />;
}

export default ChannelPage;

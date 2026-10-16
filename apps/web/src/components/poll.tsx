"use client";

export type Poll = {
  title: string;
  options: string[];
  votes?: number[];
};
import usePartySocket from "partysocket/react";
import { useEffect, useMemo, useState } from "react";
import { PollOptions } from "./poll-options";
import { useParams } from "next/navigation";
import { useCurrentWorkspace } from "@/components/workspace-provider";
import { Thread, ThreadPost } from "@wodge/data";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useCurrentRoomRep } from "@/hooks/use-room-rep";
import { useCurrentThreadRep } from "@/hooks/use-thread-rep";
import { toast } from "sonner";

export default function PollUI({
  id,
  options,
  votes,
  pollVoters,
  isRoom = false,
}: {
  id: string;
  options: string[];
  votes?: number[];
  pollVoters?: ThreadPost["pollVoters"];
  isRoom: boolean;
}) {
  const { teamId } = useParams<{ teamId: string }>();
  const { workspaceRep } = useCurrentWorkspace();
  const { user } = useCurrentUser();
  const vote = useMemo(
    () => pollVoters?.find((p) => p.voter === user?.id)?.option,
    [pollVoters, user],
  );

  const rep = useCurrentRoomRep();
  const tRep = useCurrentThreadRep();
  const sendVote = async (option: number) => {
    try {
      if (!vote)
        isRoom
          ? await rep?.mutate.vote({ msgId: id, option })
          : await tRep?.mutate.vote({
              postId: id,
              option,
            });
    } catch {
      toast.error("Failed to vote");
    }
  };

  const removeVote = async () => {
    try {
      if (vote !== undefined)
        isRoom
          ? await rep?.mutate.removeVote({ msgId: id, option: vote })
          : await tRep?.mutate.removeVote({
              postId: id,
              option: vote,
            });
    } catch {
      toast.error("Failed to remove vote");
    }
  };

  return (
    <PollOptions
      options={options}
      votes={votes}
      vote={vote}
      setVote={sendVote}
      removeVote={removeVote}
      isRoom={isRoom}
    />
  );
}

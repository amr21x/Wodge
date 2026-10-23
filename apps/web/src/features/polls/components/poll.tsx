"use client";

import type { ComponentProps } from "react";

import { FeatureGate } from "@/components/feature-flags-provider";

export type Poll = {
  title: string;
  options: string[];
  votes?: number[];
};

import { useRoomAction } from "@/features/workspace/hooks/use-room-action";
import { useMemo } from "react";
import { PollOptions } from "./poll-options";
import { useParams } from "next/navigation";
import { useCurrentWorkspace } from "@/features/workspace/state/workspace-provider";
import { ThreadPost } from "@wodge/domain/discussions/models";
import { useCurrentUser } from "@/features/account/hooks/use-current-user";
import { useCurrentRoomRep } from "@/features/rooms/hooks/use-room-rep";
import { useCurrentThreadRep } from "@/features/discussions/hooks/use-thread-rep";
import { toast } from "sonner";

function PollUIContent({
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
  useParams<{
    teamId: string;
  }>();
  useCurrentWorkspace();
  const { user } = useCurrentUser();
  const vote = useMemo(
    () => pollVoters?.find((p) => p.voter === user?.id)?.option,
    [pollVoters, user],
  );

  const roomVoteAllowed = useRoomAction("vote", isRoom);
  const canVote = !isRoom || roomVoteAllowed;
  const rep = useCurrentRoomRep();
  const tRep = useCurrentThreadRep();
  const sendVote = async (option: number) => {
    if (!canVote) return;
    try {
      if (vote === undefined) {
        if (isRoom) {
          await rep?.mutate.vote({ msgId: id, option });
        } else {
          await tRep?.mutate.vote({
            postId: id,
            option,
          });
        }
      }
    } catch {
      toast.error("Failed to vote");
    }
  };

  const removeVote = async () => {
    if (!canVote) return;
    try {
      if (vote !== undefined) {
        if (isRoom) {
          await rep?.mutate.removeVote({ msgId: id, option: vote });
        } else {
          await tRep?.mutate.removeVote({
            postId: id,
            option: vote,
          });
        }
      }
    } catch {
      toast.error("Failed to remove vote");
    }
  };

  return (
    <PollOptions
      disabled={!canVote}
      options={options}
      votes={votes}
      vote={vote}
      setVote={sendVote}
      removeVote={removeVote}
      isRoom={isRoom}
    />
  );
}

export default function PollUI(props: ComponentProps<typeof PollUIContent>) {
  return (
    <FeatureGate feature="polls">
      <PollUIContent {...props} />
    </FeatureGate>
  );
}

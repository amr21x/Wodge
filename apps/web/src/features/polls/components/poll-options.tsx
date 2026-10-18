"use client";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils/index";
import { CheckCircle } from "lucide-react";

export function PollOptions({
  options,
  votes,
  vote,
  setVote,
  removeVote,
  isRoom = false,
}: {
  options?: string[];
  votes?: number[];
  vote?: number;
  setVote: (option: number) => void;
  removeVote: () => void;
  isRoom?: boolean;
}) {
  const totalVotes = votes?.reduce((a, b) => a + b, 0) || 0;

  return (
    <div
      className={cn(
        "flex w-fit min-w-72 max-w-full flex-col gap-3 overflow-hidden p-1",
        isRoom && "pl-0",
        !isRoom && "pl-9",
      )}
    >
      <ul className="flex w-full flex-col gap-2 ">
        {options?.map((option, i) => (
          <li key={i}>
            <div
              className={cn(
                buttonVariants({
                  variant: "outline",
                }),
                "relative w-full cursor-pointer overflow-hidden aria-disabled:opacity-100",
              )}
              aria-disabled={vote !== undefined}
              onClick={() => setVote(i)}
            >
              <div
                className={
                  "absolute bottom-0 left-0 top-0 z-10 w-full rounded-none bg-secondary transition-all duration-500"
                }
                style={{
                  width:
                    vote === undefined
                      ? 0
                      : `${((votes?.[i] ?? 0) / totalVotes) * 100}%`,
                }}
              />

              <div className="z-20 flex w-full select-none items-center gap-2">
                <CheckCircle
                  className={cn(
                    "invisible h-4 w-4 shrink-0 transition-all",
                    vote === i && "visible",
                  )}
                />
                <span className="overflow-hidden overflow-y-auto truncate ">
                  {option}
                </span>

                {vote === undefined ? undefined : (
                  <span className="ml-auto">{`${((votes?.[i] ?? 0) / totalVotes) * 100}%`}</span>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between">
        <span className="flex h-8 select-none items-center text-sm text-muted-foreground transition-all hover:text-foreground">
          {totalVotes} vote{totalVotes === 1 ? "" : "s"}
        </span>
        {vote !== undefined && (
          <Button size="sm" onClick={removeVote}>
            Remove vote
          </Button>
        )}
      </div>
    </div>
  );
}

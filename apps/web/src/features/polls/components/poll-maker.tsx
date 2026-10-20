"use client";

import type { ComponentProps } from "react";

import { FeatureGate } from "@/components/feature-flags-provider";

import { useRoomAction } from "@/features/workspace/hooks/use-room-action";
import { Button } from "@/components/ui/button";
import { DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCurrentUser } from "@/features/account/hooks/use-current-user";
import { useCurrentThreadRep } from "@/features/discussions/hooks/use-thread-rep";
import { useCurrentRoomRep } from "@/features/rooms/hooks/use-room-rep";
import { useCurrentWorkspace } from "@/features/workspace/state/workspace-provider";
import { MAX_OPTIONS, MIN_OPTIONS } from "@wodge/domain/discussions/validation";
import { createEntityId } from "@wodge/domain/identifiers";
import { Plus, Trash2 } from "lucide-react";
import { useParams } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { SidebarItemBtn } from "../../workspace/components/sidebar-item-btn";

function PollMakerContent({ isRoom }: { isRoom: boolean }) {
  const roomSendAllowed = useRoomAction("send", isRoom);
  const [newOption, setNewOption] = useState<string>("");
  const [question, setQuestion] = useState("");

  useCurrentWorkspace();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [options, setOptions] = useState<string[]>([]);
  const newOptionRef = useRef<HTMLInputElement>(null);
  const rep = useCurrentRoomRep();
  const tRep = useCurrentThreadRep();

  const addNewOption = () => {
    if (newOption?.trim().length !== 0) {
      setOptions((prevOptions) => [...prevOptions, newOption]);
      setNewOption("");
    }
  };

  const deleteOption = (i: number) => {
    const arr = [...options];

    arr.splice(i, 1);
    setOptions(arr);
  };

  useParams<{
    teamId: string;
  }>();

  const { user } = useCurrentUser();

  const canAdd = options.length < MAX_OPTIONS;
  const canSubmit =
    question.length > 0 &&
    options.length >= MIN_OPTIONS &&
    options.filter((option) => option.trim().length === 0).length === 0;

  return (
    <div className="">
      <div className="px-1">
        <Label htmlFor="question">Question</Label>
        <Input
          id="question"
          placeholder="What's question you want to ask?"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              newOptionRef.current?.focus();
            }
          }}
        />
      </div>

      <p className="px-1 pb-2 pt-4 text-sm">Answers</p>

      <ul className="flex max-h-72 flex-col space-y-4 overflow-y-auto p-1">
        {options.map((value, i) => (
          <li className="flex w-full items-center gap-2" key={i}>
            <Input
              type="text"
              name={`option-${i}`}
              className="h-7 disabled:cursor-default disabled:opacity-100"
              value={value}
              onChange={() => {}}
              disabled
            />
            <SidebarItemBtn
              iconClassName="size-5"
              Icon={Trash2}
              onClick={deleteOption.bind(null, i)}
              className="h-fit"
            />
          </li>
        ))}

        {canAdd && (
          <li className="flex gap-2">
            <Input
              ref={newOptionRef}
              type="text"
              name="option-new"
              placeholder="New option"
              value={newOption}
              onChange={(e) => setNewOption(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();

                  if (newOption.length > 0) {
                    addNewOption();
                  }
                }
              }}
              className="h-7"
              // inRow
            />
            {/* <Button variant="secondary" size="sm" onClick={addNewOption}>
              Add
            </Button> */}
            <SidebarItemBtn
              className="h-fit"
              iconClassName="size-5"
              Icon={Plus}
              onClick={addNewOption}
            />
          </li>
        )}
      </ul>

      <Button
        variant="secondary"
        className="mt-2 w-full gap-2"
        size="sm"
        disabled={!canSubmit || (isRoom && !roomSendAllowed)}
        onClick={async () => {
          try {
            if (!user || (isRoom && !roomSendAllowed)) {
              return;
            }

            if (!isRoom) {
              await tRep?.mutate.createPost({
                type: "poll",
                content: question,
                createdAt: new Date().toISOString(),
                author: user.id,
                id: createEntityId(),
                pollOptions: options,
                votes: [],
                pollVoters: [],
                comments: [],
              });
            }

            if (isRoom) {
              await rep?.mutate.sendMessage({
                content: question,
                date: new Date().toISOString(),
                id: createEntityId(),
                sender: user.id,
                type: "poll",
                pollOptions: options,
                pollVoters: [],
                votes: [],
              });
            }

            closeRef.current?.click();
          } catch {
            toast.error("Failed to create poll");
          }
        }}
      >
        Create poll
      </Button>

      <DialogClose ref={closeRef} className="hidden" />
    </div>
  );
}

export function PollMaker(props: ComponentProps<typeof PollMakerContent>) {
  return (
    <FeatureGate feature="polls">
      <PollMakerContent {...props} />
    </FeatureGate>
  );
}

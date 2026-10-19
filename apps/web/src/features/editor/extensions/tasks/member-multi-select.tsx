import { SafeAvatar } from "@/components/safe-avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useMember } from "@/features/workspace/hooks/use-member";
import { cn } from "@/lib/utils/index";
import { Check, Users2 } from "lucide-react";
import { useParams } from "next/navigation";
import { forwardRef, useEffect, useMemo, useState } from "react";

import { canView } from "@wodge/auth/authorization/access";
import { Member } from "@wodge/domain/workspace/models";
import { useCurrentWorkspace } from "@/features/workspace/state/workspace-provider";
import { isEditing } from "@/features/rooms/state/atoms";

interface MemberMultiSelectProps {
  onChange?: (...event: any[]) => void;
  preset?: string[];
  bigger?: boolean;
  isEditing?: boolean;
  onBlur?: () => void;
  icon?: boolean;
  value?: string[];
  setValue: React.Dispatch<React.SetStateAction<string[]>>;
}

export function MemberMultiSelect({
  bigger,
  isEditing,
  onBlur,
  value = [],
  setValue,
  icon = true,
}: MemberMultiSelectProps) {
  // const [value, setValue] = useState<string[]>(preset || []);
  const [open, setOpen] = useState(false);

  const { channelId, teamId, folderId } = useParams<{
    channelId: string;
    teamId: string;
    folderId: string;
  }>();
  const { structure, members: membersArr } = useCurrentWorkspace();

  const members = useMemo(
    () =>
      membersArr.members.filter((m) =>
        canView({
          channelId,
          teamId,
          structure,
          members: membersArr,
          channelType: "page",
          folderId,
          userId: m.id,
        }),
      ),
    [teamId, channelId, structure, membersArr],
  );

  function onSelect(m: Member) {
    if (value.some((v) => v === m.id)) {
      const newV = value.filter((mb) => mb !== m.id);

      setValue(newV);
    } else {
      const newV = [
        ...new Set([
          ...(value || []),
          members.find((mb) => mb.id === m.id)!.id,
        ]),
      ];

      setValue(newV);
    }
  }

  if (!isEditing) {
    return (
      <Trigger icon={icon} members={members} value={value} bigger={bigger} />
    );
  }

  return (
    <Popover
      open={open}
      onOpenChange={(c) => {
        setOpen(c);
        onBlur?.();
      }}
    >
      <PopoverTrigger asChild>
        <div>
          <Trigger
            icon={icon}
            members={members}
            value={value}
            bigger={bigger}
            isEditing
          />
        </div>
      </PopoverTrigger>
      <PopoverContent className="bg-transparent p-0">
        <Command>
          <CommandInput placeholder="Search members..." />
          <CommandEmpty>No members found.</CommandEmpty>
          <CommandGroup>
            {members.map((m) => (
              <MemberItem
                isCommand
                value={value}
                key={m.id}
                memberObj={m}
                onSelect={onSelect}
              />
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function MemberItem({
  memberObj,
  isCommand,
  onSelect,
  value,
  bigger,
}: {
  memberObj?: Member;
  isCommand?: boolean;
  onSelect?: (m: Member) => void;
  value?: string[];
  bigger?: boolean;
}) {
  const { member } = useMember(memberObj?.id || "");

  if (!memberObj || !member) {
    return null;
  }

  if (isCommand) {
    return (
      <CommandItem
        key={member.id}
        value={
          member?.displayName + " " + member?.email + " " + member?.username
        }
        onSelect={() => {
          onSelect?.(memberObj);
        }}
      >
        <div className="flex w-full items-center justify-between">
          <div className="flex items-center gap-2">
            <SafeAvatar
              src={member?.avatar}
              fallback={member?.displayName}
              className={"h-6 w-6"}
            />
            <p className="flex select-none items-center truncate">
              {member.displayName}
              <span className="ml-1 text-xs text-muted-foreground">
                @{member.username}
              </span>
            </p>
          </div>
          <Check
            className={cn(
              "h-4 w-4",
              value?.some((v) => v === memberObj.id)
                ? "opacity-100"
                : "opacity-0",
            )}
          />
        </div>
      </CommandItem>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <SafeAvatar
        src={member?.avatar}
        fallback={member?.displayName}
        className={cn("h-4 w-4", bigger && "h-5 w-5")}
      />
      <p className="!mt-0 flex select-none items-center truncate">
        {member.displayName}
        <span className="ml-1 text-xs text-muted-foreground">
          @{member.username}
        </span>
      </p>
    </div>
  );
}

const Trigger = forwardRef<
  HTMLDivElement,
  {
    value: string[];
    members: Member[];
    bigger?: boolean;
    isEditing?: boolean;
    icon?: boolean;
  }
>(({ members, value, bigger, isEditing = false, icon }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        buttonVariants({
          variant: icon ? "ghost" : "outline",
          size: bigger || !icon ? "sm" : "fit",
        }),
        "max-h-7 w-full shrink-0 basis-52 justify-start gap-2 overflow-hidden text-sm aria-disabled:opacity-85 md:flex-1 md:basis-auto",
        !isEditing && "bg-transparent hover:bg-transparent",
        bigger && "max-h-20 text-sm",
        !icon && "max-h-full",
      )}
      aria-disabled={!isEditing}
    >
      {bigger && (
        <div className="flex w-36 items-center gap-2">
          <Users2 className="text h-4 w-4" />
          <p className="text-muted-foreground">Collaborators</p>
        </div>
      )}
      {value.length === 0 && (
        <>
          {!bigger && (
            <Users2 className={cn("text h-4 w-4", !icon && "hidden")} />
          )}
          <p className="text-muted-foreground">
            {bigger ? "Empty" : icon ? "Add assignees" : "Assignees"}
          </p>
        </>
      )}
      {value.length >= 1 && (
        <MemberItem
          bigger={bigger}
          memberObj={members.find((m) => m.id === value[0])}
        />
      )}
      {value.length > 1 && (
        <p className={cn("!mt-0 text-xs text-muted-foreground")}>
          +{value.length - 1} more
        </p>
      )}
    </div>
  );
});

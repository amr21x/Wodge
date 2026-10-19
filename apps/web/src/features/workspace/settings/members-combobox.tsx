import { DeepReadonlyObject } from "replicache";
import * as React from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  PopoverClose,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useMember } from "@/features/workspace/hooks/use-member";
import type { Member as MemberType } from "@wodge/domain/workspace/models";

interface MembersComboboxProps {
  members: readonly DeepReadonlyObject<MemberType>[];
  onClick?: (memberId: string) => void;
}

export function MembersCombobox({ members, onClick }: MembersComboboxProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="sm">Add a member</Button>
      </PopoverTrigger>
      <PopoverContent className="bg-transparent p-0">
        <Command>
          <CommandInput placeholder="Search a member" />
          <CommandEmpty>No members found</CommandEmpty>
          <CommandGroup>
            {members.map((member) => (
              <Member
                key={member.id}
                memberId={member.id}
                setOpen={setOpen}
                onClick={onClick}
              />
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function Member({
  memberId,
  setOpen,
  onClick,
}: {
  memberId: string;
  onClick?: (memberId: string) => void;
  setOpen: (open: boolean) => void;
}) {
  const { member } = useMember(memberId);

  if (!member) {
    return null;
  }

  return (
    <CommandItem
      key={member?.id}
      value={member.email + member.displayName + member.username}
      onSelect={() => {
        onClick?.(memberId);
        setOpen(false);
      }}
      className="flex cursor-pointer items-center gap-3"
    >
      <Avatar className="h-8 w-8">
        <AvatarImage src={member?.avatar} />
        <AvatarFallback>{member?.displayName?.[0]}</AvatarFallback>
      </Avatar>

      <div className="flex flex-col">
        <span className="text-[0.8125rem]">
          {member?.displayName} - @{member?.username}
        </span>
        <span className="text-[0.8125rem] text-muted-foreground">
          {member?.email}
        </span>
      </div>
    </CommandItem>
  );
}

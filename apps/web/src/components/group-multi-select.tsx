import { BRAND_COLOR } from "@wodge/domain/constants";
import { DrObj, Group } from "@wodge/data";
import { Button, buttonVariants } from "@/components/ui/button";

import { Check, ChevronDown } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "./ui/command";

interface GroupMultiSelectProps {
  baseGroups: readonly DrObj<Group>[];
  onChange: (...event: any[]) => void;
  preset?: string[];
}

const teamMember: Group = {
  id: "team-members",
  name: " members",
  color: BRAND_COLOR,
  members: [],
  createdBy: "",
};

export function GroupMultiSelect({
  baseGroups,
  onChange,
  preset,
}: GroupMultiSelectProps) {
  const [value, setValue] = useState<string[]>(preset || [teamMember.id]);

  const groups = useMemo(() => [teamMember, ...baseGroups], [baseGroups]);
  useEffect(() => {
    onChange?.(value);
  }, [value]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <div
          className={cn(
            buttonVariants({
              variant: "outline",
              size: "sm",
            }),
            "w-full justify-start gap-1.5",
          )}
          role="button"
        >
          {value.length >= 1 && (
            <GroupItem group={groups.find((g) => g.id === value[0])!} />
          )}
          {value.length > 1 && (
            <p className="text-xs text-muted-foreground">
              +{value.length - 1} more
            </p>
          )}

          <ChevronDown className="ml-auto h-4 w-4" />
        </div>
      </PopoverTrigger>
      <PopoverContent className="bg-transparent p-0">
        <Command>
          <CommandInput placeholder="Search groups..." />
          <CommandEmpty>No groups found.</CommandEmpty>
          <CommandGroup>
            {groups.map((g) => (
              <CommandItem
                key={g.id}
                value={g.name}
                onSelect={() => {
                  if (value.some((v) => v === g.id)) {
                    setValue((v) => v.filter((gr) => gr !== g.id));
                    return;
                  }

                  setValue((v) => [
                    ...new Set([...v, groups.find((gr) => gr.id === g.id)!.id]),
                  ]);
                }}
              >
                <div className="flex w-full items-center justify-between">
                  <GroupItem group={g} />
                  <Check
                    className={cn(
                      "h-4 w-4",
                      value.some((v) => v === g.id)
                        ? "opacity-100"
                        : "opacity-0",
                    )}
                  />
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function GroupItem({ group }: { group: DrObj<Group> }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="h-2.5 w-2.5 rounded-full"
        style={{
          backgroundColor: group.color,
        }}
      />

      <p className="select-none truncate">{group.name}</p>
    </div>
  );
}

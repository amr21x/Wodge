"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

import { ChevronRight, Plus } from "lucide-react";
import { TooltipWrapper } from "../tooltip-wrapper";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { buttonVariants } from "../ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
} from "../ui/command";

interface ComboBoxCellProps {
  renderer: React.ReactNode;
  placeholder?: string;
  emptyMsg?: string;
  nData?: number;
  label?: string;
  children?: React.ReactNode;
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
  placeholderClassName?: string;
}

export function ComboboxCell({
  renderer,
  placeholder,
  emptyMsg,
  nData = 2,
  children,
  label,
  open = false,
  onOpenChange,
  className,
  placeholderClassName,
}: ComboBoxCellProps) {
  const labelText = nData > 0 ? `Manage ${label}` : "";

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <TooltipWrapper content={labelText} side="top">
        <PopoverTrigger asChild>
          <div
            className={cn(
              buttonVariants({
                size: "fit",
                variant: "ghost",
              }),
              "group w-48 max-w-48 cursor-pointer justify-start gap-1 font-normal",
            )}
          >
            {nData > 0 && <span className="relative truncate">{renderer}</span>}

            {nData === 0 && (
              <div
                className={cn(
                  "flex w-full items-center justify-start gap-1",
                  placeholderClassName,
                )}
              >
                <Plus className="h-3.5 w-3.5" />
                <span className="text-[0.875rem] font-normal">Add {label}</span>
              </div>
            )}

            {nData > 0 && (
              <ChevronRight
                className={cn(
                  "h-4 w-4 shrink-0 opacity-50 transition-all group-hover:opacity-100",
                  open && "rotate-90",
                )}
              />
            )}
          </div>
        </PopoverTrigger>
      </TooltipWrapper>

      <PopoverContent
        className={cn("w-[200px] p-0", className)}
        sticky="always"
      >
        <Command>
          <CommandInput placeholder={placeholder} className="h-9" />
          <CommandEmpty>{emptyMsg}</CommandEmpty>
          <CommandGroup>{children}</CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

"use client";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/index";
import { Table } from "@tanstack/react-table";
import { Search, X } from "lucide-react";
import { useRef } from "react";

interface SettingsSearchInputProps<TData> {
  table: Table<TData>;
  searchColumn: string;
  placeHolder?: string;
}

export function SettingsSearchInput<TData>({
  searchColumn,
  table,
  placeHolder,
}: SettingsSearchInputProps<TData>) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="relative flex w-80">
      <Input
        placeholder={placeHolder || "Search"}
        className="pl-8 pr-8"
        value={
          (table.getColumn(searchColumn)?.getFilterValue() as string) ?? ""
        }
        onChange={(e) => {
          table.getColumn(searchColumn)?.setFilterValue(e.target.value);
        }}
        ref={inputRef}
      />
      <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 transform" />
      <X
        role="button"
        aria-label="clear search"
        className={cn(
          "absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 transform opacity-50 hover:opacity-100",
          table.getColumn(searchColumn)?.getFilterValue()
            ? "cursor-pointer"
            : "hidden",
        )}
        onClick={() => {
          table.getColumn(searchColumn)?.setFilterValue("");
        }}
      />
    </div>
  );
}

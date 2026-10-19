"use client";
import * as React from "react";

import { RowData, Table as TableType, flexRender } from "@tanstack/react-table";

import { Updater } from "use-immer";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";

import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import { Plus } from "lucide-react";

declare module "@tanstack/react-table" {
  interface TableMeta<TData extends RowData> {
    edited: Set<number>;
    setEdited: Updater<Set<number>>;
    isEditing: boolean;
    setIsEditing: React.Dispatch<React.SetStateAction<boolean>>;

    buffer: Map<number, Partial<TData>>;
    setBuffer: Updater<Map<number, Partial<TData>>>;
    submitRow: (idx: number) => void;
    discard: (idx: number) => void;
  }
}

interface DataTableProps<TData> {
  table: TableType<TData>;
  withPagination?: boolean;
  label?: string;
  withForm?: boolean;
  placeholder?: string;
  className?: string;
  withHeader?: boolean;
}

function DataTable<TData>({
  table,
  label,
  placeholder,
  className,
  withHeader,
}: DataTableProps<TData>) {
  if (!table.options?.meta) {
    return null;
  }
  // const [isEditing, setIsEditing] = React.useState(false);

  const { isEditing, setIsEditing, setEdited } = table.options.meta;

  return (
    <div className={className}>
      <Table>
        {withHeader && (
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
        )}
        <TableBody>
          {table.getCenterRows()?.length > 0 ? (
            table.getCenterRows().map((row) => (
              <TableRow
                className="group/row"
                key={row.id}
                data-state={row.getIsSelected() && "selected"}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : placeholder ? (
            <TableRow>
              <TableCell className="h-12 text-center">{placeholder}</TableCell>
            </TableRow>
          ) : null}
          {table.getBottomRows()?.length > 0 &&
            table.getBottomRows().map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && "selected"}
                className="relative"
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className={cn("invisible", isEditing && "visible")}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
                <TableCell
                  className={cn(
                    "absolute left-0 top-1/2 z-50 flex w-full -translate-y-1/2 text-muted-foreground",
                    isEditing && "invisible right-0",
                  )}
                >
                  {!isEditing && (
                    <Button
                      size="fit"
                      variant="ghost"
                      className="w-full justify-center gap-1 p-1.5 text-sm"
                      onClick={() => {
                        setEdited((draft) => {
                          draft.add(row.index);
                        });
                        setIsEditing(true);
                      }}
                    >
                      <Plus className="h-4 w-4" />
                      <span className="text-sm">New {label}</span>
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>

      {/* <DataTablePagination table={table} withForm={withForm} /> */}
    </div>
  );
}

export { DataTable };

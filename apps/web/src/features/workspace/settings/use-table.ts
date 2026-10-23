"use client";

import * as React from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  RowPinningState,
  getCoreRowModel,
  getFilteredRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Updater, useImmer } from "use-immer";
import { RowData } from "@tanstack/react-table";
import { produce } from "immer";

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

interface UpdateHandlerProps<TData> {
  data: Partial<TData>;
  idx: number;
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  updateHandler?: ({ data, idx }: UpdateHandlerProps<TData>) => void;
  withForm?: boolean;
}

export function useTable<TData, TValue>({
  data,
  columns,
  updateHandler,
}: DataTableProps<TData, TValue>) {
  const [rowSelection, setRowSelection] = React.useState({});
  const [rowPinning, setRowPinning] = React.useState<RowPinningState>({
    top: [],
    bottom: [],
  });

  const [edited, setEdited] = useImmer<Set<number>>(new Set());
  const [isEditing, setIsEditing] = React.useState(false);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [buffer, setBuffer] = useImmer<Map<number, Partial<TData>>>(new Map());

  const table = useReactTable({
    data,
    columns,

    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onRowSelectionChange: setRowSelection,
    onRowPinningChange: setRowPinning,
    onColumnFiltersChange: setColumnFilters,
    state: {
      rowSelection,
      rowPinning,
      columnFilters,
    },
    meta: {
      edited,
      setEdited,
      buffer,
      setBuffer,
      isEditing,
      setIsEditing,
      submitRow: (idx: number) => {
        const updateData = buffer.get(idx);

        if (updateData) {
          updateHandler?.({ data: updateData, idx });
        }
      },

      discard: (idx: number) => {
        setBuffer(
          produce((draft) => {
            draft.delete(idx);
          }),
        );

        setEdited(
          produce((draft) => {
            draft.delete(idx);
          }),
        );

        setIsEditing(false);
      },
    },
  });

  return { table, edited, buffer, setBuffer, setEdited };
}

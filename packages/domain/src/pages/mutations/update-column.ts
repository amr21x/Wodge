import { produce } from "immer";
import type { DrObj } from "../../types";
import { Column } from "../schema";

export function updateColumnMutation({
  col,
  columns,
}: {
  col: Column;
  columns: Column[] | DrObj<Column[]>;
}) {
  const newColumns = produce(columns, (draft) => {
    const colIdx = draft.findIndex((c) => c.id === col.id);

    if (colIdx === -1) return draft;

    draft[colIdx] = col;

    return draft;
  });

  return newColumns as Column[];
}

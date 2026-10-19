import { Column } from "@wodge/domain/pages/models";
import type { DrObj } from "@wodge/domain/types";
import { produce } from "immer";

export function updateColumnMutation({
  col,
  columns,
}: {
  col: Column;
  columns: Column[] | DrObj<Column[]>;
}) {
  const newColumns = produce(columns, (draft) => {
    const colIdx = draft.findIndex((c) => c.id === col.id);

    if (colIdx === -1) {
      return draft;
    }

    draft[colIdx] = col;

    return draft;
  });

  return newColumns as Column[];
}

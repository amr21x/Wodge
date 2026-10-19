import { Column } from "@wodge/domain/pages/models";
import type { DrObj } from "@wodge/domain/types";
import { produce } from "immer";

export function createColumnMutation({
  col,
  columns,
}: {
  col: Column;
  columns: Column[] | DrObj<Column[]>;
}) {
  const newColumns = produce(columns, (draft) => {
    draft.push(col);

    return draft;
  });

  return newColumns as Column[];
}

import { produce } from "immer";
import type { DrObj } from "../../types";
import { Column } from "../schema";

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

import { Row, Table } from "@tanstack/react-table";
import { Checkbox } from "../ui/checkbox";

export function DataTableHeaderSelect<TData>({
  table,
}: {
  table: Table<TData>;
}) {
  return (
    <div className="flex items-center px-2">
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    </div>
  );
}

export function DataTableRowSelect<TData extends { id: string }>({
  row,
}: {
  row: Row<TData>;
}) {
  if (row.original.id.startsWith("add")) {
    return null;
  }

  return (
    <div className="flex items-center px-2">
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => {
          row.toggleSelected(!!value);
        }}
        aria-label="Select row"
      />
    </div>
  );
}

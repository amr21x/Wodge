import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Check, MoreHorizontal, Trash2, X } from "lucide-react";
import { Row, Table } from "@tanstack/react-table";
import { Children } from "react";
import { SidebarItemBtn } from "@/features/workspace/components/sidebar-item-btn";

interface DataTableActionsProps<TData> {
  table: Table<TData>;
  row: Row<TData>;
  menuItems?: {
    label?: string;
    action?: () => void;
    destructive?: boolean;
    type?: "separator" | "item";
    disabled?: boolean;
  }[];

  children?: React.ReactNode;
}

export function DataTableActions<TData>({
  table,
  row,
  children,
  menuItems,
}: DataTableActionsProps<TData>) {
  const isEdited = table.options.meta?.edited.has(row.index);

  const nActions = Children.count(children) || 0;

  return (
    <div
      className="flex justify-end"
      style={{
        width: `calc(${nActions * 1.75}rem + 1.75rem + 1.5rem)`,
      }}
    >
      <div
        className={cn("flex gap-1 overflow-hidden transition-all")}
        style={{
          width: `calc( ${nActions * 1.75}rem + 1.5rem )`,
          ...(isEdited && {
            width: `calc(${nActions * 1.75}rem + 1.75rem + 1.5rem)`,
          }),
        }}
      >
        {children}
        <div
          className={cn(
            "transition-transform",
            isEdited && "invisible translate-x-full opacity-0",
          )}
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarItemBtn
                Icon={MoreHorizontal}
                className={cn(menuItems?.length === 0 && "invisible")}
              />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-52">
              {menuItems?.map((item, idx) => {
                if (item.type === "separator") {
                  return <DropdownMenuSeparator key={idx} />;
                }

                return (
                  <DropdownMenuItem
                    key={idx}
                    disabled={item?.disabled}
                    destructive={item?.destructive}
                    disclosure={item?.destructive}
                    {...(item?.destructive
                      ? { onDisclosureConfirm: item?.action }
                      : {
                          onClick: item?.action,
                        })}
                  >
                    <Trash2 className="h-4 w-4" />
                    {item?.label}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <SidebarItemBtn
          Icon={Check}
          onClick={() => table.options.meta?.submitRow(row.index)}
          className={cn(
            "text-success-base invisible transition-all",
            isEdited && "visible -translate-x-7",
          )}
        />

        <SidebarItemBtn
          Icon={X}
          className={cn(
            "invisible transition-all",
            isEdited && "visible -translate-x-7",
          )}
          onClick={() => {
            table.options.meta?.discard(row.index);
          }}
        />
      </div>
    </div>
  );
}

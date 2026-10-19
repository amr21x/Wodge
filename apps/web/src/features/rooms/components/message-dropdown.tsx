import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { SidebarItemBtn } from "../../workspace/components/sidebar-item-btn";

interface MessageDropDownProps {
  onEdit?: () => void;
  onDelete?: () => void;
  canEdit?: boolean;
  canDelete?: boolean;
  isPoll?: boolean;
}

export function MessageDropDown({
  onDelete,
  onEdit,
  canDelete,
  isPoll,
  canEdit,
}: MessageDropDownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarItemBtn
          Icon={MoreHorizontal}
          className="ml-auto h-fit shrink-0 transition-all hover:bg-transparent group-hover:visible aria-expanded:visible md:invisible"
        />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        {!isPoll && (
          <>
            <DropdownMenuItem
              disabled={!canEdit}
              onClick={() => {
                onEdit?.();
              }}
            >
              <Pencil className="h-4 w-4" />
              Edit message
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}

        <DropdownMenuItem
          disabled={!canDelete}
          disclosure
          destructive
          onDisclosureConfirm={() => {
            onDelete?.();
          }}
        >
          <Trash2 className="h-4 w-4" />
          Delete message
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

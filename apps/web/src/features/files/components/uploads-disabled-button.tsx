import type { LucideIcon } from "lucide-react";
import { TooltipWrapper } from "@/components/tooltip-wrapper";
import { SidebarItemBtn } from "@/features/workspace/components/sidebar-item-btn";
import { cn } from "@/lib/utils/index";

export const UPLOADS_DISABLED = "File uploads are disabled";

/** Shows where an upload control would be while the attachments flag is off. */
export function UploadsDisabledButton({
  Icon,
  className,
}: {
  Icon: LucideIcon;
  className?: string;
}) {
  return (
    <TooltipWrapper content={UPLOADS_DISABLED}>
      {/* aria-disabled keeps pointer events so the tooltip can explain why. */}
      <SidebarItemBtn
        Icon={Icon}
        className={cn("cursor-not-allowed", className)}
        iconClassName="opacity-30 group-hover/sidebtn:opacity-30"
        aria-disabled
        sr={UPLOADS_DISABLED}
        onClick={(event) => event.preventDefault()}
      />
    </TooltipWrapper>
  );
}

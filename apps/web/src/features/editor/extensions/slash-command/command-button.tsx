import { forwardRef } from "react";
import { cn } from "@/lib/utils/index";
import { LucideIcon } from "lucide-react";
import { Icon } from "../../ui/icon";

export type CommandButtonProps = {
  active?: boolean;
  description: string;
  icon: LucideIcon;
  onClick: () => void;
  title: string;
};

export const CommandButton = forwardRef<HTMLButtonElement, CommandButtonProps>(
  ({ active, icon, onClick, title }, ref) => {
    const wrapperClass = cn(
      "flex items-center justify-start gap-2 rounded p-1.5 text-xs font-semibold text-neutral-500",
      !active && "bg-transparent hover:bg-neutral-50 hover:text-black",
      active && "bg-neutral-100 text-black hover:bg-neutral-100",
    );

    return (
      <button ref={ref} onClick={onClick} className={wrapperClass}>
        <Icon Icon={icon} className="h-3 w-3" />
        <div className="flex flex-col items-start justify-start">
          <div className="text-sm font-medium">{title}</div>
        </div>
      </button>
    );
  },
);

// CommandButton.displayName = "CommandButton";

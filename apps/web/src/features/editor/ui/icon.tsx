import { cn } from "@/lib/utils/index";
import { LucideIcon } from "lucide-react";
import { memo } from "react";

type IconProps = {
  Icon?: LucideIcon;
  className?: string;
  strokeWidth?: number;
};

export const Icon = memo(({ Icon, className, strokeWidth }: IconProps) => {
  if (!Icon) {
    return null;
  }

  return (
    <Icon
      className={cn("h-4 w-4", className)}
      strokeWidth={strokeWidth || 2.5}
    />
  );
});

Icon.displayName = "Icon";

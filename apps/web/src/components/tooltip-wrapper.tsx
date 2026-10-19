import * as React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

interface TooltipWrapperProps {
  children: React.ReactNode;
  content?: string | React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  sideOffset?: number;
  className?: string;
}

export const TooltipWrapper = React.forwardRef<
  HTMLDivElement,
  TooltipWrapperProps
>(
  (
    {
      children,
      content = "",
      side = "bottom",
      sideOffset = 4,
      className,
      ...props
    },
    _ref,
  ) => {
    return (
      <TooltipProvider {...props} delayDuration={100}>
        <Tooltip>
          <TooltipTrigger asChild>{children}</TooltipTrigger>

          {content && (
            <TooltipContent
              side={side}
              sideOffset={sideOffset}
              className={className}
              hideWhenDetached
            >
              {content}
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>
    );
  },
);

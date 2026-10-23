import { forwardRef } from "react";
import { cn } from "@/lib/utils/index";
import { Slot } from "@radix-ui/react-slot";
import { Surface } from "../surface";

type PanelProps = {
  spacing?: "medium" | "small";
  noShadow?: boolean;
  asChild?: boolean;
} & React.HTMLAttributes<HTMLDivElement>;

export const Panel = forwardRef<HTMLDivElement, PanelProps>(
  ({ asChild, className, children, spacing, noShadow, ...rest }, ref) => {
    const panelClass = cn(
      "p-2",
      spacing === "small" && "p-[0.2rem]",
      className,
    );

    const Comp = asChild ? Slot : "div";

    return (
      <Comp ref={ref} {...rest}>
        <Surface className={panelClass} withShadow={!noShadow}>
          {children}
        </Surface>
      </Comp>
    );
  },
);

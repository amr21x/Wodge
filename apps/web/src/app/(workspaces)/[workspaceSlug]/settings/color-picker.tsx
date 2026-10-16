import * as React from "react";
import { BRAND_COLOR } from "@wodge/domain/constants";

import { useState } from "react";
import { HexColorInput, HexColorPicker } from "react-colorful";
import { Check } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { inputVariants } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Button, ButtonProps } from "@/components/ui/button";

const presetColors = [
  BRAND_COLOR,
  "#64748b",
  "#6b7280",
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#14b8a6",
  "#0ea5e9",
  "#8b5cf6",
  "#db2777",
];

interface ColorPickerProps {
  defaultColor?: string;
  withSwatches?: boolean;
  handler?: (color: string) => void;
}

export function ColorPicker({
  defaultColor,
  withSwatches = false,
  handler,
}: ColorPickerProps) {
  const [color, setColor] = useState(defaultColor || BRAND_COLOR);
  const [selected, setSelected] = useState<number>(0);

  function onSetColor(color: string) {
    setSelected(0);
    setColor(color);
    handler?.(color);
  }

  return (
    <div className={cn("flex items-center gap-3")}>
      <Popover>
        <PopoverTrigger asChild>
          <Swatch swatchColor={color} sid={0} selected={selected} />
        </PopoverTrigger>
        <PopoverContent className="color-picker space-y-6 ">
          <HexColorPicker color={color} onChange={onSetColor} />
          <HexColorInput
            className={cn(inputVariants(), "w-full")}
            color={color}
            onChange={onSetColor}
          />
        </PopoverContent>
      </Popover>

      {withSwatches && (
        <>
          <Separator orientation="vertical" className="h-6" />
          <div className="flex gap-1">
            {presetColors.map((c, i) => (
              <Swatch
                key={c}
                selected={selected}
                swatchColor={c}
                handler={(c) => {
                  setSelected(i + 1);
                  setColor(c);
                }}
                sid={i + 1}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

interface SwatchProps extends ButtonProps {
  swatchColor: string;
  handler?: (color: string) => void;
  sid: number;
  selected: number;
}

export const Swatch = React.forwardRef<HTMLButtonElement, SwatchProps>(
  ({ swatchColor, handler, sid, selected, className, ...props }, ref) => (
    <Button
      size="sm"
      type="button"
      variant="outline"
      className={cn(
        "relative m-0 h-8 w-8 overflow-hidden rounded-sm border border-border/50 bg-transparent p-0 shadow-lg",
        className,
      )}
      onClick={handler?.bind(null, swatchColor)}
      ref={ref}
      {...props}
    >
      <div
        className="h-full w-full shrink-0 "
        style={{ backgroundColor: swatchColor }}
      />
    </Button>
  ),
);

// Swatch.displayName = "Swatch";

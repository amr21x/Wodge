import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import { useCallback } from "react";
import { Toolbar } from "../ui/toolbar";
import { Surface } from "../ui/surface";
import { DropdownButton } from "../ui/Dropdown/Dropdown";
import { Icon } from "../ui/icon";

const FONT_SIZES = [
  { label: "Smaller", value: "12px" },
  { label: "Small", value: "14px" },
  { label: "Medium", value: "" },
  { label: "Large", value: "18px" },
  { label: "Extra Large", value: "24px" },
];

export type FontSizePickerProps = {
  onChange: (value: string) => void; // eslint-disable-line no-unused-vars
  value: string;
};

export const FontSizePicker = ({ onChange, value }: FontSizePickerProps) => {
  const currentValue = FONT_SIZES.find((size) => size.value === value);
  const currentSizeLabel = currentValue?.label.split(" ")[0] || "Medium";

  const selectSize = useCallback(
    (size: string) => () => onChange(size),
    [onChange],
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Toolbar.Button active={!!currentValue?.value}>
          {currentSizeLabel}
          <Icon Icon={ChevronDown} className="h-2 w-2" />
        </Toolbar.Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent asChild>
        <Surface className="flex flex-col gap-1 px-2 py-4">
          {FONT_SIZES.map((size) => (
            <DropdownButton
              isActive={value === size.value}
              onClick={selectSize(size.value)}
              key={`${size.label}_${size.value}`}
            >
              <span style={{ fontSize: size.value }}>{size.label}</span>
            </DropdownButton>
          ))}
        </Surface>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

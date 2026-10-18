import { hexToRgb } from "@/lib/utils";

export function Tag({
  name,
  color = "#1d4ed8",
  noBg = false,
}: {
  name: string;
  color?: string;
  noBg?: boolean;
}) {
  if (noBg) {
    return (
      <div className="flex items-center rounded-full">
        <div
          style={{
            backgroundColor: color,
          }}
          className="mr-1 h-2 w-2 rounded-full text-xs"
        />

        <span className="truncate">{name}</span>
      </div>
    );
  }

  return (
    <div
      className="flex items-center rounded-full border border-border/40 px-1.5 py-0.5 text-xs"
      style={{
        backgroundColor: `rgba(${hexToRgb(color)},0.2)`,
      }}
    >
      <div
        style={{
          backgroundColor: color,
        }}
        className="mr-1 h-2 w-2 rounded-full text-xs"
      />

      <span className="truncate">{name}</span>
    </div>
  );
}

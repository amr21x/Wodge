import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils/index";

import { Folder as FolderIcon } from "lucide-react";

export function Folder({ name }: { name?: string }) {
  return (
    <div
      className={cn(
        buttonVariants({
          variant: "ghost",
          size: "sm",
        }),
        "w-full items-center justify-start gap-2 rounded-none py-4",
      )}
    >
      <FolderIcon className="h-4 w-4" />
      <span>{name}</span>
    </div>
  );
}

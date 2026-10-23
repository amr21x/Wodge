import { Workspace } from "@wodge/domain/workspace/models";
import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { Skeleton } from "@/components/ui/skeleton";
import { SafeAvatar } from "@/components/safe-avatar";

export function WorkspaceItem({ workspace }: { workspace: Workspace }) {
  return (
    <Link href={"/" + workspace.slug} className="w-full">
      <div className="dark:hover:bg-surface group flex w-full shrink-0 items-center gap-2 overflow-hidden py-3 pl-4 transition-all hover:bg-background">
        <SafeAvatar
          src={workspace?.avatar}
          className="h-6 w-6 shrink-0 rounded-md"
          fallbackClassName="rounded-md text-base uppercase"
          fallback={workspace?.name}
        />

        <div className="flex flex-col">
          <p className="truncate">{workspace.name}</p>
        </div>

        <div className="text-primary-base ml-auto flex translate-x-full items-center gap-0.5 text-xs transition-all group-hover:-translate-x-4">
          <p>Open</p>
          <ChevronRight className="h-4 w-4" />
        </div>
      </div>
    </Link>
  );
}

WorkspaceItem.Skeleton = function () {
  return (
    <div className="flex w-full gap-2 px-4 py-1.5">
      <Skeleton className="h-6 w-6" />
      <Skeleton className="h-6 w-full" />
    </div>
  );
};

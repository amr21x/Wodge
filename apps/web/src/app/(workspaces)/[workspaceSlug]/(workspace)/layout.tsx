"use client";

import { AppHeader } from "@/features/workspace/components/app-header";
import { SidebarWrapper } from "@/features/workspace/components/sidebar-wrapper";
import { useIsDesktop } from "@/hooks/use-is-desktop";
import { cn } from "@/lib/utils";
import { isSidebarOpenAtom } from "@/client/state/global-atoms";
import { useAtom } from "jotai";
import { useEffect } from "react";

function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const isDesktop = useIsDesktop();
  const [isSidebarOpen, setSidebarOpen] = useAtom(isSidebarOpenAtom);

  useEffect(() => {
    setSidebarOpen(isDesktop);
  }, [isDesktop]);

  return (
    <div className="flex h-dvh w-full ">
      <SidebarWrapper />

      <div
        className="flex h-full w-full flex-col"
        onClick={() => {
          if (!isDesktop) {
            setSidebarOpen(false);
          }
        }}
      >
        <AppHeader />
        <div
          className={cn(
            "w-[calc(100vw-15rem)] flex-1 overflow-y-auto transition-all",
            !isSidebarOpen && "w-[calc(100vw-0rem)]",
            isSidebarOpen && "w-[calc(100vw-15rem)]",
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

export default WorkspaceLayout;

"use client";

import {
  ArrowDownWideNarrow,
  Filter,
  PanelLeftClose,
  Search,
} from "lucide-react";
import { SidebarItemBtn } from "./sidebar-item-btn";
import { WorkspaceSwitcher } from "./workspace-switcher";
import { useAtom } from "jotai";
import { isSidebarOpenAtom } from "@/client/state/global-atoms";
import { cn } from "@/lib/utils/index";

export function SidebarHeader() {
  const [isSidebarOpen, setSidebar] = useAtom(isSidebarOpenAtom);
  const closeSidebar = setSidebar.bind(null, false);

  return (
    <div
      className={cn(
        "flex h-12 max-h-12 w-60 max-w-60 items-center overflow-hidden border-r border-border/50 bg-dim px-2 py-2.5",
        !isSidebarOpen && "w-0 px-0",
      )}
    >
      <WorkspaceSwitcher />

      <div className=" ml-auto flex shrink-0  items-center gap-1">
        <SidebarItemBtn Icon={PanelLeftClose} onClick={closeSidebar} />
        {/* <SidebarItemBtn Icon={ArrowDownWideNarrow} /> */}
      </div>
    </div>
  );
}

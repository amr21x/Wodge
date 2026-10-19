"use client";

import { useContext } from "react";
import { SettingsCollapsiblePlaceHolder } from "../settings";
import { SidebarItem } from "../../components/sidebar-item";
import { useIsDesktop } from "@/hooks/use-is-desktop";
import { cn } from "@/lib/utils/index";
import { useCurrentWorkspace } from "@/features/workspace/state/workspace-provider";
import { usePathname } from "next/navigation";
import { SheetClose } from "@/components/ui/sheet";

export function GroupsSidebar() {
  const { structure, workspaceSlug } = useCurrentWorkspace();
  const pathname = usePathname();

  const groups = structure.groups;

  const isDesktop = useIsDesktop();

  if (groups.length === 0) {
    return (
      <SettingsCollapsiblePlaceHolder>No groups</SettingsCollapsiblePlaceHolder>
    );
  }

  const baseUrl = `/${workspaceSlug}/settings/groups`;

  return (
    <ul className="flex flex-col gap-1">
      {groups.map((group) => {
        let jsx = (
          <SidebarItem
            noIcon
            className={cn("justify-start py-1.5 pr-1.5")}
            href={`${baseUrl}/${group.id}`}
            isActive={pathname.split("/").at(-1) === group.id}
          >
            <div
              className="mr-1.5 h-5 w-5 shrink-0 rounded-md border border-primary/30 text-xs"
              style={{
                backgroundColor: group.color,
              }}
            />
            <span className="select-none truncate">{group.name}</span>
          </SidebarItem>
        );

        if (!isDesktop) {
          jsx = <SheetClose asChild>{jsx}</SheetClose>;
        }

        return <li key={group.id}>{jsx}</li>;
      })}
    </ul>
  );
}

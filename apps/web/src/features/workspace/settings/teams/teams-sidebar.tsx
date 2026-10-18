"use client";

import { SettingsCollapsiblePlaceHolder } from "../settings";
import { SidebarItem } from "../../components/sidebar-item";
import { useCurrentWorkspace } from "@/features/workspace/state/workspace-provider";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { usePathname } from "next/navigation";
import { useIsDesktop } from "@/hooks/use-is-desktop";
import { SheetClose } from "@/components/ui/sheet";

export function TeamsSidebar() {
  const { structure, workspaceSlug } = useCurrentWorkspace();
  const pathname = usePathname();
  const isDesktop = useIsDesktop();

  const teams = structure.teams;

  if (teams.length === 0) {
    return (
      <SettingsCollapsiblePlaceHolder>No teams</SettingsCollapsiblePlaceHolder>
    );
  }

  const baseUrl = `/${workspaceSlug}/settings/teams`;

  return (
    <ul className="flex flex-col gap-1">
      {teams.map((team) => {
        let jsx = (
          <SidebarItem
            noIcon
            onClick={() => {}}
            href={`${baseUrl}/${team.id}`}
            isActive={pathname.split("/").at(-1) === team.id}
          >
            <Avatar className="mr-1.5 h-5 w-5 shrink-0 rounded-md border border-primary/30 text-xs">
              {/* <AvatarImage src={workspace?.avatar} /> */}
              <AvatarFallback className="select-none rounded-md text-xs uppercase">
                {team.name[0]}
              </AvatarFallback>
            </Avatar>

            <span className="select-none truncate">{team.name}</span>
          </SidebarItem>
        );

        if (!isDesktop) {
          jsx = <SheetClose asChild>{jsx}</SheetClose>;
        }

        return (
          <li key={team.id} className="group flex grow">
            {jsx}
          </li>
        );
      })}
    </ul>
  );
}

"use client";

import { cn } from "@/lib/utils/index";
import { SidebarItemBtn } from "../components/sidebar-item-btn";
import {
  Building2,
  PanelLeft,
  RefreshCcw,
  User2,
  UserCircle,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  SettingsSidebarCollapsibleItem,
  SettingsSidebarHeader,
  SettingsSidebarItem,
  SettingsSidebarList,
} from "./settings";
import { GroupsSidebar } from "./groups/groups-sidebar";
import { TeamsSidebar } from "./teams/teams-sidebar";
import { useIsDesktop } from "@/hooks/use-is-desktop";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useIsOwnerOrAdmin } from "@/features/workspace/hooks/use-is-owner-or-admin";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useCurrentWorkspace } from "@/features/workspace/state/workspace-provider";
import { useQueryClient } from "@tanstack/react-query";

export function SettingsSidebar() {
  const isDesktop = useIsDesktop();
  const isManger = useIsOwnerOrAdmin();
  const { workspaceSlug } = useParams<{ workspaceSlug?: string }>();
  const { workspaceRep } = useCurrentWorkspace();
  const queryClient = useQueryClient();

  const jsx = (
    <div className="flex h-full flex-col">
      <div className="flex justify-between pb-6 text-muted-foreground">
        <h2>Settings</h2>
      </div>
      <div className="overflow-y-auto">
        {workspaceSlug && (
          <>
            <SettingsSidebarHeader>
              <Building2 className="h-4 w-4" />
              <span>Workspace</span>
            </SettingsSidebarHeader>
            <SettingsSidebarList>
              <SettingsSidebarItem label="general" href="/" isDefault />
              {isManger && (
                <>
                  <SettingsSidebarItem label="members" />

                  <SettingsSidebarCollapsibleItem label="groups">
                    <GroupsSidebar />
                  </SettingsSidebarCollapsibleItem>
                  <SettingsSidebarCollapsibleItem label="teams">
                    <TeamsSidebar />
                  </SettingsSidebarCollapsibleItem>

                  <SettingsSidebarItem label="upgrade" />
                </>
              )}
            </SettingsSidebarList>
          </>
        )}

        <div className="h-4" />
        <SettingsSidebarHeader>
          <User2 className="h-4 w-4" />
          <span>My Account</span>
        </SettingsSidebarHeader>

        <SettingsSidebarList>
          <SettingsSidebarItem
            label="account"
            href={workspaceSlug ? "/account" : "/"}
            isDefault={!!!workspaceSlug}
          />
        </SettingsSidebarList>
      </div>
      <Button
        size="sm"
        variant="secondary"
        className="mt-auto w-full shrink-0"
        onClick={() => {
          workspaceRep?.pull();
          queryClient.invalidateQueries({});
        }}
      >
        <RefreshCcw className="mr-2 h-4 w-4" />
        Sync
      </Button>
    </div>
  );

  if (isDesktop) {
    return (
      <div
        suppressHydrationWarning
        className={cn(
          "flex h-dvh w-56 shrink-0 grow flex-col border-r border-border/50 bg-dim px-6 pb-6 pt-10 transition-all",
        )}
      >
        {jsx}
      </div>
    );
  }

  return (
    <SheetContent
      side="left"
      className="h-full w-56 bg-dim pb-6 pt-10"
      suppressHydrationWarning
    >
      {jsx}
    </SheetContent>
  );
}

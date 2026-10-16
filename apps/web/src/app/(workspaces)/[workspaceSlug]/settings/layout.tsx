"use client";

import { SettingsContent } from "@/app/(workspaces)/[workspaceSlug]/settings/settings";
import { SettingsSidebar } from "@/app/(workspaces)/[workspaceSlug]/settings/settings-sidebar";
import { isAdmin, isOwner } from "@wodge/data";
import { Sheet } from "@/components/ui/sheet";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useCurrentWorkspace } from "@/components/workspace-provider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full w-full">
      <Sheet>
        <SettingsSidebar />
        <SettingsContent>
          <div className="flex h-full w-full">{children}</div>
        </SettingsContent>
      </Sheet>
    </div>
  );
}

export default SettingsLayout;

"use client";

import { SettingsContent } from "@/features/workspace/settings/settings";
import { SettingsSidebar } from "@/features/workspace/settings/settings-sidebar";
import { isAdmin, isOwner } from "@wodge/auth/authorization/access";
import { Sheet } from "@/components/ui/sheet";
import { useCurrentUser } from "@/features/account/hooks/use-current-user";
import { useCurrentWorkspace } from "@/features/workspace/state/workspace-provider";
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

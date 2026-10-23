"use client";

import { SettingsContent } from "@/features/workspace/settings/settings";
import { SettingsSidebar } from "@/features/workspace/settings/settings-sidebar";

import { Sheet } from "@/components/ui/sheet";

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

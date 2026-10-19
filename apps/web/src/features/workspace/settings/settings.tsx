"use client";

import { SidebarItem } from "../components/sidebar-item";
import { useFeatureFlags } from "@/components/feature-flags-provider";
import { pageFeatures } from "@wodge/core/features/policy";
import { disabledFeature } from "@wodge/core/features/flags";

import {
  LucideIcon,
  PanelLeft,
  Plus,
  ShieldPlusIcon,
  Users2,
  X,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { SidebarItemBtn } from "../components/sidebar-item-btn";
import { IconType } from "react-icons/lib";
import { useIsDesktop } from "@/hooks/use-is-desktop";
import { cn } from "@/lib/utils/index";
import { Button, ButtonProps } from "@/components/ui/button";
import { useCurrentWorkspace } from "@/features/workspace/state/workspace-provider";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useState } from "react";
import { SheetClose, SheetTrigger } from "@/components/ui/sheet";

interface SettingsCollapsibleItemProps {
  label: string;
  children?: React.ReactNode;
  actionIcon?: LucideIcon | IconType;
}

function SettingsSidebarList({ children }: { children: React.ReactNode }) {
  return <ul className="flex flex-col gap-1 py-3">{children}</ul>;
}

function SettingsSidebarHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 text-sm font-medium text-muted-foreground">
      {children}
    </div>
  );
}

function SettingsSidebarItem({
  label,
  href,
  isDefault,
}: {
  label: string;
  href?: string;
  isDefault?: boolean;
}) {
  const flags = useFeatureFlags();
  const { workspaceSlug } = useCurrentWorkspace();
  const curPage = usePathname().split("/").at(3);
  const isActive = curPage === label || (isDefault && !curPage);
  const isDesktop = useIsDesktop();

  if (
    disabledFeature(
      flags,
      pageFeatures(`/${workspaceSlug}/settings${href || `/${label}`}`),
    )
  )
    return null;

  const jsx = (
    <SidebarItem
      noIcon
      className={cn("justify-start py-1.5 pl-7 pr-1.5 capitalize")}
      href={`/${workspaceSlug}/settings${href ? href : `/${label}`}`}
      isActive={isActive}
    >
      <span className="truncate">{label}</span>
    </SidebarItem>
  );

  if (isDesktop) {
    return jsx;
  }

  return <SheetClose asChild>{jsx}</SheetClose>;
}

function SettingsSidebarCollapsibleItem({
  label,
  children,
  actionIcon,
}: SettingsCollapsibleItemProps) {
  const flags = useFeatureFlags();
  const { workspaceSlug } = useCurrentWorkspace();
  const curPage = usePathname().split("/").at(3);
  const [open, setOpen] = useState(curPage === label);
  const isActive = curPage === label;

  const isDesktop = useIsDesktop();

  if (
    disabledFeature(flags, pageFeatures(`/${workspaceSlug}/settings/${label}`))
  )
    return null;

  const actionBtn = (
    <SidebarItemBtn
      Icon={actionIcon || Plus}
      className={cn(
        "-my-1 ml-auto transition-all group-hover:visible md:invisible",
        isActive && "visible",
      )}
      href={`/${workspaceSlug}/settings/${label}/new`}
    />
  );

  const Icon = label === "groups" ? ShieldPlusIcon : Users2;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <SidebarItem
          Icon={Icon}
          className={cn("group justify-start py-1.5 pl-2.5 pr-1.5 capitalize")}
          isActive={curPage === label}
          collapsible
        >
          <span className="truncate">{label}</span>

          {isDesktop ? actionBtn : <SheetClose asChild>{actionBtn}</SheetClose>}
        </SidebarItem>
      </CollapsibleTrigger>
      <CollapsibleContent className="py-1 pl-[1.0625rem]">
        <div className="border-l border-border p-0 pl-[0.625rem]">
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function SettingsCollapsiblePlaceHolder({
  children,
}: {
  children: React.ReactNode;
}) {
  return <p className="pl-2 text-sm text-muted-foreground">{children}</p>;
}

function SettingsContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="bg-page flex w-full basis-full justify-center overflow-y-scroll px-8 py-10 md:px-6">
      <div
        className={cn(
          "flex w-full max-w-2xl shrink-0 grow flex-col items-center",
          className,
        )}
      >
        <div className="h-[2.75rem] w-full shrink-0 ">
          <div className="flex w-full items-start justify-between">
            <SheetTrigger asChild>
              <SidebarItemBtn
                Icon={PanelLeft}
                className={cn(
                  "visible -ml-1 w-fit opacity-100 transition-all  duration-300 md:invisible",
                )}
              />
            </SheetTrigger>

            <SettingsClose />
          </div>
        </div>

        {children}
      </div>
    </div>
  );
}

function SettingsContentHeader({
  label,
  description,
  footer,
}: {
  label: string;
  description?: string;
  footer?: string;
}) {
  return (
    <div className="pb-6">
      <div className="space-y-1.5">
        <h2 className="text-xl">{label}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
        {footer && <p className="text-xs text-muted-foreground">{footer}</p>}
      </div>
    </div>
  );
}

function SettingsContentSection({
  children,
  header,
  action,
  className,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
  header?: string;
  className?: string;
}) {
  return (
    <div className={cn("py-6", !header && "px-2 py-4")}>
      {header && (
        <div className="flex items-center justify-between pb-4">
          <h3 className="text-base capitalize">{header}</h3>
          {action}
        </div>
      )}
      <div className={className}>{children}</div>
    </div>
  );
}

function SettingsContentDescription({
  children,
}: {
  children: React.ReactNode;
}) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

function SettingsContentAction(props: ButtonProps) {
  return <Button {...props} size="sm" className="w-fit" />;
}

function SettingsClose() {
  const { workspaceSlug } = useCurrentWorkspace();
  const router = useRouter();

  return (
    <Button
      className="-mr-1  items-start
       p-0 text-muted-foreground/70 transition-all hover:text-foreground"
      size="fit"
      variant="link"
      onClick={() => router.push("/" + (workspaceSlug || ""))}
    >
      <X className="h-6 w-6" />
    </Button>
  );
}

export {
  SettingsSidebarList,
  SettingsSidebarHeader,
  SettingsCollapsiblePlaceHolder,
  SettingsSidebarItem,
  SettingsContent,
  SettingsClose,
  SettingsContentHeader,
  SettingsContentSection,
  SettingsContentDescription,
  SettingsContentAction,
  SettingsSidebarCollapsibleItem,
};

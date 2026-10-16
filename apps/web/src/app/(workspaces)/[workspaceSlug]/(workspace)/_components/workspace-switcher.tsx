"use client";

import { useCurrentWorkspace } from "@/components/workspace-provider";

import { useUserWorkspaces } from "@/hooks/use-user-workspaces";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import {
  Building2,
  Check,
  ChevronsUpDown,
  Computer,
  LogOut,
  Monitor,
  MoonStar,
  Settings,
  Sun,
  Users2,
} from "lucide-react";
import { Workspace } from "@wodge/data";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useIsOwnerOrAdmin } from "@/hooks/use-is-owner-or-admin";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/toast";
import { useParams, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { SafeAvatar } from "@/components/safe-avatar";

export function WorkspaceSwitcher() {
  const { workspace, workspaceSlug } = useCurrentWorkspace();
  const { userWorkspaces } = useUserWorkspaces();
  const { setTheme, theme } = useTheme();

  const isPrivileged = useIsOwnerOrAdmin();
  const router = useRouter();

  if (!workspace) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div
          className={cn(
            buttonVariants({ variant: "ghost", size: "fit" }),
            "group max-w-44 cursor-pointer items-center justify-start pl-[0.345rem]",
          )}
          role="button"
          aria-label="Switch workspace"
        >
          <SafeAvatar
            src={workspace?.avatar}
            className="mr-2 h-6 w-6 shrink-0 rounded-md"
            fallbackClassName=" rounded-md text-sm uppercase"
            fallback={workspace?.name}
          />

          <p className="mr-1.5 truncate">{workspace?.name}</p>
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-50 group-hover:opacity-100" />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent alignOffset={0} align="start" className="w-52">
        <DropdownMenuGroup>
          <Link href="/">
            <DropdownMenuItem className="gap-2 text-sm">
              <Building2 className="h-4 w-4" />
              All Workspaces
            </DropdownMenuItem>
          </Link>

          <Link href={`/${workspaceSlug}/settings`}>
            <DropdownMenuItem className="gap-2 text-sm">
              <Settings className="h-4 w-4" />
              Workspace settings
            </DropdownMenuItem>
          </Link>
          {isPrivileged && (
            <>
              <Link href={`/${workspaceSlug}/settings/members`}>
                <DropdownMenuItem className="gap-2 text-sm">
                  <Users2 className="h-4 w-4" />
                  Manage members
                </DropdownMenuItem>
              </Link>
            </>
          )}
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Switch workspace</DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent className="flex w-48 flex-col gap-0.5">
                {userWorkspaces?.map((ws) => (
                  <SwitcherItem key={ws.id} workspace={ws} />
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>

          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Theme</DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent>
                <DropdownMenuItem
                  className="gap-2 text-sm"
                  onClick={() => setTheme("light")}
                >
                  <Sun className="h-4 w-4" />
                  Light
                  {theme === "light" && (
                    <Check className="ml-auto h-4 w-4 shrink-0" />
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="gap-2 text-sm"
                  onClick={() => setTheme("dark")}
                >
                  <MoonStar className="h-4 w-4" />
                  Dark
                  {theme === "dark" && (
                    <Check className="ml-auto h-4 w-4 shrink-0" />
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="gap-2 text-sm"
                  onClick={() => setTheme("system")}
                >
                  <Monitor className="h-4 w-4" />
                  System
                  {theme === "system" && (
                    <Check className="ml-auto h-4 w-4 shrink-0" />
                  )}
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>

          <DropdownMenuItem
            className="gap-2 text-sm"
            onClick={async () => {
              const supabase = createClient();

              const { error } = await supabase.auth.signOut();

              if (error) {
                toast.error("Failed to log out");
              } else {
                router.push("/login");
              }
            }}
          >
            <LogOut className="h-4 w-4" />
            Log out
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SwitcherItem({ workspace }: { workspace: Workspace }) {
  const { workspaceSlug } = useParams<{ workspaceSlug: string }>();

  if (!workspaceSlug) return null;
  return (
    <Link href={`/${workspace.slug}`}>
      <DropdownMenuItem
        className={cn(
          buttonVariants({
            variant: "ghost",
            size: "fit",
          }),
          "w-full cursor-pointer justify-start gap-2.5",
        )}
      >
        <SafeAvatar
          src={workspace?.avatar}
          className="h-6 w-6 shrink-0 rounded-md"
          fallbackClassName="rounded-md text-sm uppercase"
          fallback={workspace?.name}
        />

        <p className="truncate">{workspace.name}</p>

        {workspaceSlug === workspace.slug && (
          <Check className="ml-auto h-4 w-4 shrink-0" />
        )}
      </DropdownMenuItem>
    </Link>
  );
}

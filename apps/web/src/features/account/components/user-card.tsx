import { signOut } from "@/features/auth/client";
import { SafeAvatar } from "@/components/safe-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/toast";
import { useCurrentUser } from "@/features/account/hooks/use-current-user";
import { cn } from "@/lib/utils/index";
import {
  Check,
  LogOut,
  Monitor,
  MoonStar,
  RefreshCcw,
  Settings2,
  Sun,
} from "lucide-react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

export function UserCard({ className }: { className?: string }) {
  const { user } = useCurrentUser();
  const router = useRouter();

  const queryClient = useQueryClient();

  const { theme, setTheme } = useTheme();
  // TODO add skeleton

  if (!user) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div
          className={cn(
            "flex cursor-pointer select-none items-center gap-2 rounded-md px-2 py-1 hover:bg-secondary/60 aria-expanded:bg-secondary/60",
            className,
          )}
        >
          <SafeAvatar
            src={user.avatar}
            className="h-10 w-10"
            fallback={user.displayName}
          />
          <div>
            <p className="truncate text-sm font-medium">{user.displayName}</p>
            <p className="truncate text-xs text-muted-foreground">
              @{user.username}
            </p>
          </div>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-36">
        <Link href="/settings">
          <DropdownMenuItem className="gap-2 text-sm">
            <Settings2 className="h-4 w-4" />
            Settings
          </DropdownMenuItem>
        </Link>

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
          onClick={() => {
            queryClient.invalidateQueries({});
          }}
        >
          <RefreshCcw className="h-4 w-4" />
          Sync
        </DropdownMenuItem>

        <DropdownMenuItem
          className="gap-2 text-sm"
          onClick={async () => {
            const { error } = await signOut();

            if (error) {
              toast.error("Failed to log out");
            } else {
              router.push("/login");
            }
          }}
        >
          <LogOut className="h-4 w-4" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

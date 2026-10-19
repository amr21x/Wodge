import { SafeAvatar } from "@/components/safe-avatar";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils/index";
import { SidebarItemBtn } from "./sidebar-item-btn";
import { LogOut, Mic, MicOff, RefreshCcw, Settings } from "lucide-react";
import { useCurrentUser } from "@/features/account/hooks/use-current-user";
import { isSidebarOpenAtom } from "@/client/state/global-atoms";
import { useAtom, useAtomValue } from "jotai";
import { useParams, useRouter } from "next/navigation";
import { TooltipWrapper } from "@/components/tooltip-wrapper";
import { signOut } from "@/features/auth/client";
import { toast } from "sonner";
import {
  isSpeakingAtom,
  micStatusAtom,
  roomAtom,
} from "../../rooms/state/atoms";
import { useQueryClient } from "@tanstack/react-query";
import { useCurrentWorkspace } from "@/features/workspace/state/workspace-provider";

export function UserCard() {
  const { user } = useCurrentUser();

  const isSidebarOpen = useAtomValue(isSidebarOpenAtom);

  const { workspaceSlug } = useParams<{ workspaceSlug: string }>();

  const isSpeaking = useAtomValue(isSpeakingAtom);

  const router = useRouter();

  const queryClient = useQueryClient();

  const { workspaceRep } = useCurrentWorkspace();

  const [micStatus, setMicStatus] = useAtom(micStatusAtom);
  const room = useAtomValue(roomAtom);

  return (
    <div
      className={cn(
        "flex max-h-12 min-h-7 w-60 items-center overflow-hidden  border-r  border-t border-border/50 bg-background px-1.5 py-2 transition-all",
        !isSidebarOpen && " w-0 px-0",
      )}
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div
            className={cn(
              buttonVariants({
                size: "fit",
                variant: "ghost",
              }),
              "group/card relative w-full select-none justify-start gap-3 overflow-hidden",
            )}
            role="button"
            aria-label={user?.displayName || "User card"}
          >
            <SafeAvatar
              src={user?.avatar}
              fallback={user?.displayName}
              className={cn(
                "h-6 w-6",
                isSpeaking && "ring-green-500 dark:ring-green-600",
              )}
            />
            <p
              className={cn(
                "absolute left-9 top-full translate-y-full text-sm transition-all group-hover/card:top-1/2 group-hover/card:-translate-y-1/2",
              )}
            >
              @{user?.username}
            </p>
            <p className="absolute left-9 top-1/2 -translate-y-1/2 text-sm transition-all group-hover/card:top-0 group-hover/card:-translate-y-full">
              {user?.displayName}
            </p>
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem
            className="gap-2 text-sm"
            onClick={() => {
              workspaceRep?.pull();
              queryClient.invalidateQueries({});
            }}
          >
            <RefreshCcw className="h-4 w-4" />
            Sync
          </DropdownMenuItem>
          <DropdownMenuItem
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

      <TooltipWrapper
        content={micStatus ? "Turn Off Microphone" : "Turn On Microphone"}
      >
        <SidebarItemBtn
          Icon={micStatus ? Mic : MicOff}
          className={cn(
            "ml-auto ",
            !micStatus && "text-destructive hover:text-destructive",
          )}
          onClick={() => {
            if (room) {
              room.room.localParticipant.setMicrophoneEnabled(!micStatus);
            }

            setMicStatus(!micStatus);
          }}
          iconClassName="h-5 w-5"
        />
      </TooltipWrapper>
      <TooltipWrapper content="User Settings">
        <SidebarItemBtn
          Icon={Settings}
          className=" "
          iconClassName="h-5 w-5"
          href={
            workspaceSlug ? `/${workspaceSlug}/settings/account` : "/settings"
          }
        />
      </TooltipWrapper>
    </div>
  );
}

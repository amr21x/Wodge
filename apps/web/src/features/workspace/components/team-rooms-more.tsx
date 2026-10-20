import { FeatureGate } from "@/components/feature-flags-provider";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FileCog, FilePlus, MoreHorizontal, Settings } from "lucide-react";
import { SidebarItemBtn } from "./sidebar-item-btn";

import { useCurrentWorkspace } from "@/features/workspace/state/workspace-provider";
import { createEntityId } from "@wodge/domain/identifiers";
import Link from "next/link";
import { toast } from "sonner";
import { AddRoomForm } from "./add-room-form";

interface TeamMoreProps {
  teamId: string;
}

export function TeamRoomsMore({ teamId }: TeamMoreProps) {
  const { workspaceRep, workspaceSlug } = useCurrentWorkspace();

  async function createBlankRoom() {
    try {
      await workspaceRep?.mutate.createRoom({
        teamId,
        name: "New room",

        id: createEntityId(),
        avatar: "",
      });
    } catch {
      toast.error("Room creation failed");
    }
  }

  return (
    <Dialog>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarItemBtn
            Icon={MoreHorizontal}
            className="z-10 -my-1 ml-auto flex transition-all hover:bg-transparent group-hover:visible aria-expanded:visible md:invisible"
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-48" sideOffset={2}>
          <DropdownMenuGroup>
            <DropdownMenuLabel>Rooms</DropdownMenuLabel>
            <DropdownMenuItem
              className="gap-2 text-sm"
              onClick={createBlankRoom}
            >
              <FilePlus className="h-4 w-4" />
              New room
            </DropdownMenuItem>

            <DialogTrigger asChild>
              <DropdownMenuItem className="gap-2 text-sm">
                <FileCog className="h-4 w-4" />
                Custom room
              </DropdownMenuItem>
            </DialogTrigger>
          </DropdownMenuGroup>

          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <FeatureGate feature="teamManagement">
              <Link href={`/${workspaceSlug}/settings/teams/${teamId}`}>
                <DropdownMenuItem className="gap-2 text-sm">
                  <Settings className="h-4 w-4" />
                  Team settings
                </DropdownMenuItem>
              </Link>
            </FeatureGate>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <AddRoomForm teamId={teamId} />
    </Dialog>
  );
}

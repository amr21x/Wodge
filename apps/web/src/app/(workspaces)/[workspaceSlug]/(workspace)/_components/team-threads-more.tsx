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

import { useCurrentWorkspace } from "@/components/workspace-provider";
import { nanoid } from "nanoid";
import { ID_LENGTH } from "@wodge/domain/constants";
import Link from "next/link";
import { AddRoomForm } from "./add-room-form";
import { AddThreadForm } from "./add-thread-form";
import { toast } from "sonner";

interface TeamMoreProps {
  teamId: string;
}

export function TeamThreadsMore({ teamId }: TeamMoreProps) {
  const { workspaceRep, workspaceSlug } = useCurrentWorkspace();

  async function createBlankRoom() {
    try {
      await workspaceRep?.mutate.createThread({
        teamId,
        name: "New thread",
        editGroups: [],
        viewGroups: [],
        id: nanoid(ID_LENGTH),
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
              New thread
            </DropdownMenuItem>

            <DialogTrigger asChild>
              <DropdownMenuItem className="gap-2 text-sm">
                <FileCog className="h-4 w-4" />
                Custom thread
              </DropdownMenuItem>
            </DialogTrigger>
          </DropdownMenuGroup>

          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <Link href={`/${workspaceSlug}/settings/teams/${teamId}`}>
              <DropdownMenuItem className="gap-2 text-sm">
                <Settings className="h-4 w-4" />
                Team settings
              </DropdownMenuItem>
            </Link>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <AddThreadForm teamId={teamId} />
    </Dialog>
  );
}

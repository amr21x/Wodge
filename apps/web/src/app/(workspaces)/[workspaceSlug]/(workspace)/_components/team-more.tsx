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
import {
  FileCog,
  FilePlus,
  FolderCog,
  FolderPlus,
  MoreHorizontal,
  Pen,
  Pencil,
  Settings,
  Trash2,
} from "lucide-react";
import { SidebarItemBtn } from "./sidebar-item-btn";
import { AddPageForm } from "./add-page-form";
import { AddFolderForm } from "./add-folder-form";
import { useState } from "react";
import { useCurrentWorkspace } from "@/components/workspace-provider";
import { nanoid } from "nanoid";
import { Folder } from "@wodge/data";
import { ID_LENGTH, WORKSPACE_GROUP_ID_LENGTH } from "@wodge/domain/constants";
import { Page } from "@wodge/domain/pages";
import Link from "next/link";
import { recentlyVisitedAtom } from "@/store/global-atoms";
import { useSetAtom } from "jotai";
import { produce } from "immer";
import { toast } from "sonner";

interface TeamMoreProps {
  teamId: string;
  folderId?: string;
  folder?: Folder;
}

export function TeamMore({ teamId, folderId, folder }: TeamMoreProps) {
  const [activeTab, setActiveTab] = useState("folder");
  const { workspaceRep, workspaceSlug, workspaceId } = useCurrentWorkspace();

  const setRecentAtom = useSetAtom(recentlyVisitedAtom);

  async function createBlankPage() {
    try {
      await workspaceRep?.mutate.createPage({
        folderId: folderId || "root-" + teamId,
        teamId,
        name: "New page",

        id: nanoid(ID_LENGTH),
        editGroups: ["team-members"],
        viewGroups: ["team-members"],
        avatar: "",
      });
    } catch {
      toast.error("Page creation failed");
    }
  }

  async function createFolder() {
    try {
      await workspaceRep?.mutate.updateTeam({
        teamId,
        teamUpdate: {
          action: "addFolder",
          update: {
            folder: {
              name: "New folder",
              id: nanoid(WORKSPACE_GROUP_ID_LENGTH),
              channels: [],
              parentFolder: folderId,
            },
          },
        },
      });
    } catch {
      toast.error("Folder creation failed");
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
            <DropdownMenuLabel>Pages</DropdownMenuLabel>
            <DropdownMenuItem
              className="gap-2 text-sm"
              onClick={createBlankPage}
            >
              <FilePlus className="h-4 w-4" />
              New page
            </DropdownMenuItem>

            <DialogTrigger asChild>
              <DropdownMenuItem
                className="gap-2 text-sm"
                onClick={() => setActiveTab("page")}
              >
                <FileCog className="h-4 w-4" />
                Custom page
              </DropdownMenuItem>
            </DialogTrigger>
          </DropdownMenuGroup>
          {/* TODO USE IT FOR NESTED FOLDERS */}
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuLabel>Folders</DropdownMenuLabel>
            <DropdownMenuItem className="gap-2 text-sm" onClick={createFolder}>
              <FolderPlus className="h-4 w-4" />
              New folder
            </DropdownMenuItem>

            <DialogTrigger asChild>
              <DropdownMenuItem
                className="gap-2 text-sm"
                onClick={() => setActiveTab("folder")}
              >
                <FolderCog className="h-4 w-4" />
                Custom folder
              </DropdownMenuItem>
            </DialogTrigger>
          </DropdownMenuGroup>
          {!folderId && (
            <>
              <DropdownMenuSeparator />

              <DropdownMenuGroup>
                <Link href={`/${workspaceSlug}/settings/teams/${teamId}`}>
                  <DropdownMenuItem className="gap-2 text-sm">
                    <Settings className="h-4 w-4" />
                    Team settings
                  </DropdownMenuItem>
                </Link>
              </DropdownMenuGroup>
            </>
          )}

          {folderId && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Folder settings</DropdownMenuLabel>
              <DialogTrigger asChild>
                <DropdownMenuItem
                  className="gap-2 text-sm"
                  onClick={() => setActiveTab("folderEdit")}
                >
                  <Pencil className="h-4 w-4" />
                  Edit folder
                </DropdownMenuItem>
              </DialogTrigger>
              <DropdownMenuItem
                destructive
                disclosure
                onDisclosureConfirm={async () => {
                  try {
                    await workspaceRep?.mutate.deleteFolder({
                      teamId,
                      folderId,
                    });
                  } catch {
                    toast.error("Folder deletion failed");
                  }
                }}
              >
                <Trash2 className="h-4 w-4" />
                Delete folder
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {activeTab === "page" && (
        <AddPageForm teamId={teamId} folderId={folderId} />
      )}

      {activeTab === "folder" && (
        <AddFolderForm teamId={teamId} parentOverride={folderId} />
      )}

      {activeTab === "folderEdit" && (
        <AddFolderForm teamId={teamId} folder={folder} />
      )}
    </Dialog>
  );
}

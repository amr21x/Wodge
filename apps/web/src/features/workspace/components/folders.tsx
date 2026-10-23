import * as React from "react";

import { SidebarItem } from "./sidebar-item";
import { FolderIcon } from "lucide-react";
import { DrObj } from "@wodge/domain/types";
import type { Folder as FolderType } from "@wodge/domain/workspace/models";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useMemo } from "react";
import { cn } from "@/lib/utils/index";
import { useAtomValue } from "jotai";
import { openFoldersAtom } from "@/features/workspace/state/atoms";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Channels } from "./channels";
import { TeamMore } from "./team-more";
import { useIsTeamModerator } from "@/features/workspace/hooks/use-is-team-moderator";

export function Folders({
  folders,
  teamId,
  parentOverride = false,
}: {
  folders: readonly DrObj<FolderType>[];
  teamId: string;
  parentOverride?: boolean;
}) {
  const foldersIds = useMemo(() => folders?.map((d) => d.id) || [], [folders]);

  return (
    <div className="h-full">
      <SortableContext
        items={foldersIds}
        strategy={verticalListSortingStrategy}
      >
        <ul className="flex flex-col-reverse gap-1">
          {folders?.map((f, i) => (
            <SortableDirectory
              key={f.id}
              folder={f}
              teamId={teamId}
              idx={i}
              folders={folders}
              override={parentOverride}
            />
          ))}
        </ul>
      </SortableContext>
    </div>
  );
}

// Teamspace

function SortableDirectory({
  folder,
  teamId,
  idx,
  folders,
  override,
}: {
  folder: DrObj<FolderType>;
  teamId: string;
  idx: number;
  folders: readonly DrObj<FolderType>[];
  override: boolean;
}) {
  const { setNodeRef, isDragging, active, index, overIndex } = useSortable({
    id: folder.id,
    data: {
      type: "folder",
      teamId: teamId,
      idx,
    },
  });

  const isRoot = folder.id.startsWith("root");

  const isOpen = useAtomValue(openFoldersAtom).includes(folder.id);
  const isSomethingOver = index === overIndex;
  const isChannelOver =
    isSomethingOver &&
    active?.data?.current?.type === "channel" &&
    active?.data?.current?.folderId !== folder.id;

  const isTeamMod = useIsTeamModerator();

  const childFolders = useMemo(
    () => folders.filter((f) => f.parentFolder === folder.id),
    [folders, folder.id],
  );

  if (!override && folder.parentFolder) {
    return null;
  }

  return (
    <Collapsible
      defaultOpen={isRoot}
      className={
        cn()
        // "border-b-2 border-t-2 border-b-transparent border-t-transparent",
        // isSomethingOver && isFolderOver && isAbove && "border-t-blue-400",
        // isSomethingOver && isFolderOver && isBelow && "border-b-blue-400",
        // !isRoot && "pl-3",
      }
    >
      <CollapsibleTrigger asChild>
        {!isRoot && (
          <div
            className={cn(
              // "border-b-2 border-b-transparent",
              isSomethingOver && isOpen && isChannelOver && "border-b-blue-400",
            )}
          >
            <Folder
              isMod={isTeamMod}
              folder={folder}
              teamId={teamId}
              isChannelOver={isChannelOver}
              isDragging={isDragging}
              ref={setNodeRef}
            />
          </div>
        )}
      </CollapsibleTrigger>
      <CollapsibleContent
        className={cn("transition-all", !isRoot && "py-1 pl-3.5")}
      >
        <div
          className={cn(
            "space-y-1",
            !isRoot && "p-0 pl-2",
            !isRoot && folder.channels.length > 0 && "border-l border-border",
          )}
        >
          {folder.channels.length === 0 && (
            <span className="px-2 text-xs text-muted-foreground">
              No pages found
            </span>
          )}

          <Folders
            folders={childFolders}
            teamId={teamId}
            parentOverride={true}
          />
          <Channels
            teamId={teamId}
            channels={folder.channels}
            folderId={folder.id}
            type="page"
          />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

interface DraggableProps {
  isChannelOver?: boolean;
  isDragging: boolean;
  teamId: string;
  isMod: boolean;
}

const Folder = React.forwardRef<
  HTMLLIElement,
  { folder: DrObj<FolderType> } & DraggableProps &
    React.HTMLAttributes<HTMLLIElement>
>(
  (
    { folder, isMod = false, teamId, isChannelOver, isDragging, ...props },
    ref,
  ) => {
    return (
      <li ref={ref} className="group flex grow items-center" {...props}>
        {/* <GripVertical
        className={cn(
          "invisible h-3.5 w-3.5 text-black group-hover:visible",
          activeIndex && activeIndex !== -1 && "invisible",
        )}
      /> */}
        <SidebarItem
          aria-disabled={isDragging}
          isActive={isChannelOver}
          Icon={FolderIcon}
          collapsible
        >
          <span className="select-none truncate">{folder.name}</span>

          {isMod && (
            /* oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- This wrapper only stops events from child controls; it has no independent action. */
            <div
              className="ml-auto"
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              <TeamMore
                folderId={folder.id}
                teamId={teamId}
                folder={folder as FolderType}
              />
            </div>
          )}
        </SidebarItem>
      </li>
    );
  },
);

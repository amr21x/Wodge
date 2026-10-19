import * as React from "react";

import { SidebarItem } from "./sidebar-item";
import {
  ChevronRight,
  Component,
  FileText,
  GripVertical,
  MoreHorizontal,
} from "lucide-react";
import { SidebarItemBtn } from "./sidebar-item-btn";
import { DrObj } from "@wodge/domain/types";
import type { Channel as ChannelType } from "@wodge/domain/channels/index";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMemo } from "react";

import { cn } from "@/lib/utils/index";
import { useCurrentWorkspace } from "@/features/workspace/state/workspace-provider";

export function Pages({
  channels,
  folderId,
  teamId,
}: {
  channels: readonly DrObj<ChannelType>[];
  folderId: string;
  teamId: string;
}) {
  const channelsIds = useMemo(
    () => channels?.map((c) => c.id) || [],
    [channels],
  );

  return (
    <div>
      <SortableContext
        items={channelsIds}
        strategy={verticalListSortingStrategy}
      >
        <ul>
          {channels?.map((channel, i) => (
            <SortablePage
              key={channel.id}
              channel={channel}
              folderId={folderId}
              teamId={teamId}
              idx={i}
            />
          ))}
        </ul>
      </SortableContext>
    </div>
  );
}

// Teamspace

function SortablePage({
  channel,
  folderId,
  teamId,
  idx,
}: {
  channel: DrObj<ChannelType>;
  folderId: string;
  teamId: string;
  idx: number;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    activeIndex,
    index,
    overIndex,
    active,
  } = useSortable({
    id: channel.id,
    data: {
      type: "channel",
      folderId,
      teamId,
      idx,
    },
  });

  const isSomethingOver = index === overIndex;
  const isChannelOver = active?.data?.current?.type === "channel";

  const isAbove = activeIndex > overIndex;
  const isBelow = activeIndex < overIndex;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      {...listeners}
      {...attributes}
      className={cn(
        // "border-b-2 border-t-2 border-b-transparent border-t-transparent",
        isSomethingOver && isChannelOver && isAbove && "border-t-blue-400",
        isSomethingOver && isChannelOver && isBelow && "border-b-blue-400",
      )}
    >
      <Page
        channel={channel}
        activeIndex={activeIndex}
        isDragging={isDragging}
        ref={setNodeRef}
      />
    </div>
  );
}

interface DraggableProps {
  activeIndex?: number;
  isDragging: boolean;
}

export const Page = React.forwardRef<
  HTMLLIElement,
  { channel: DrObj<ChannelType> } & DraggableProps &
    React.HTMLAttributes<HTMLLIElement>
>(({ channel, activeIndex, isDragging, ...props }, ref) => {
  const { workspaceId } = useCurrentWorkspace();

  return (
    <li ref={ref} className="group flex grow items-center" {...props}>
      <SidebarItem
        aria-disabled={isDragging}
        Icon={FileText}
        href={`/${workspaceId}/${channel.id}`}
      >
        <span className="select-none truncate">{channel.name}</span>
        <SidebarItemBtn
          Icon={MoreHorizontal}
          className="-my-1 ml-auto"
          onClick={() => {}}
        />
      </SidebarItem>
    </li>
  );
});

// Page.displayName = "Page";

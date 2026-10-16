import { DrObj, Room, Thread } from "@wodge/data";
import { Page } from "@wodge/domain/pages";
import { format } from "date-fns";
import { useSetAtom } from "jotai";
import {
  Database,
  GanttChart,
  MessageCircle,
  Newspaper,
  NotebookText,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { activeSidebarAtom } from "./_components/sidebar-atoms";
import { useCurrentWorkspace } from "@/components/workspace-provider";
import { RecentlyVisitedItem } from "@/store/global-atoms";

export function RecentItem({ item }: { item: RecentlyVisitedItem }) {
  let Icon;
  let channel;
  let folder;

  const { structure } = useCurrentWorkspace();
  const setSidebarAtom = useSetAtom(activeSidebarAtom);

  const { workspaceSlug } = useParams<{ workspaceSlug: string }>();

  let url = `/${workspaceSlug}/${item.type}/${item.teamId}`;

  const team = structure?.teams.find((t) => t.id === item.teamId);

  switch (item.type) {
    case "page":
      Icon = NotebookText;
      folder = team?.folders.find((f) => f.id === item.folderId);
      channel = folder?.channels.find(
        (c) => c.id === item.channelId,
      ) as DrObj<Page>;
      url = `${url}/${item.folderId}/${item.channelId}`;
      break;
    case "room":
      Icon = MessageCircle;
      channel = team?.rooms.find((c) => c.id === item.channelId) as DrObj<Room>;
      url = `${url}/${item.channelId}`;
      break;
    case "thread":
      Icon = GanttChart;
      channel = team?.threads.find(
        (c) => c.id === item.channelId,
      ) as DrObj<Thread>;
      url = `${url}/${item.channelId}`;
      break;
    case "resources":
      Icon = Database;
      break;
    default:
      Icon = NotebookText;
  }

  return (
    <Link
      href={url}
      onClick={() => {
        setSidebarAtom(item.type);
      }}
    >
      <div className="group/item rounded-md border border-border bg-background">
        <div className="relative h-6 bg-secondary/40 px-3 ">
          <Icon className="absolute bottom-0 h-5 w-5 translate-y-1/2 opacity-50 transition-all group-hover/item:opacity-100" />
        </div>
        <div className="px-3 pb-2 pt-4">
          <p>{channel?.name || "Resources"}</p>
          {folder && (
            <span className="truncate text-xs text-muted-foreground">
              {folder?.name} /{" "}
            </span>
          )}

          <span className="truncate text-sm text-muted-foreground">
            {team?.name}
          </span>
          <p className="text-xs text-muted-foreground">
            {format(item.time, "MMM d, hh:mm a")}
          </p>
        </div>
      </div>
    </Link>
  );
}

import { DrObj, Message } from "@wodge/data";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { Download, File } from "lucide-react";
import { SidebarItemBtn } from "../../../_components/sidebar-item-btn";
import { env } from "@wodge/env";
import { download, getSrcLink } from "@/lib/utils";
import { useState } from "react";

export function FileMessage({
  message,
  workspaceId,
}: {
  message: DrObj<Message>;
  workspaceId: string;
}) {
  const { channelId, teamId } = useParams<{
    channelId: string;
    teamId: string;
  }>();

  const [isPending, setIsPending] = useState(false);

  return (
    <div className="flex items-center gap-1 py-1">
      <File className="h-5 w-5" />
      <p className="mr-1.5">{message.content}</p>
      <SidebarItemBtn
        Icon={Download}
        isPending={isPending}
        onClick={async () => {
          setIsPending(true);
          const link = await getSrcLink(
            message.id,
            workspaceId,
            channelId,
            teamId,
          );

          if (!link) throw new Error("Failed to get audio link");
          await download(link);
          setIsPending(false);
        }}
      />
    </div>
  );
}

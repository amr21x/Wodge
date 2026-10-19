import { DrObj } from "@wodge/domain/types";
import { Message } from "@wodge/domain/rooms/models";

import { useParams } from "next/navigation";
import { Download, File } from "lucide-react";
import { SidebarItemBtn } from "../../workspace/components/sidebar-item-btn";

import { download, getSrcLink } from "@/features/files/download";
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

          if (!link) {
            throw new Error("Failed to get audio link");
          }

          await download(link);
          setIsPending(false);
        }}
      />
    </div>
  );
}

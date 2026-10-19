"use client";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { SidebarItemBtn } from "../../workspace/components/sidebar-item-btn";
import { Plus } from "lucide-react";
import Uppy from "@uppy/core";
import { useMemo, useState } from "react";
import XHRUpload from "@uppy/xhr-upload";
import { Dashboard } from "@uppy/react";
import { useSetAtom } from "jotai";
import { useCurrentUser } from "@/features/account/hooks/use-current-user";
import { useQueryClient } from "@tanstack/react-query";
import { Message } from "@wodge/domain/rooms/models";
import type { RoomMutators } from "@/client/sync/rooms/mutators";
import { Replicache } from "replicache";
import { env } from "@wodge/env/client";
import Webcam from "@uppy/webcam";

import Audio from "@uppy/audio";
import { toast } from "sonner";
import { useUploadToken } from "../../workspace/components/use-upload-token";

export function UploadButton({
  workspaceId,
  channelId,
  teamId,
  rep,
}: {
  workspaceId?: string;
  teamId: string;
  channelId: string;
  rep?: Replicache<RoomMutators>;
}) {
  const [open, setOpen] = useState(false);

  const { user } = useCurrentUser();

  const token = useUploadToken();

  const uppyRef = useMemo(() => {
    return !token
      ? null
      : new Uppy({
          allowMultipleUploadBatches: false,
          restrictions: {
            allowedFileTypes: [
              "image/*",
              "text/*",
              "audio/*",
              "video/*",
              "application/*",
              ".ppsx",
            ],
            maxNumberOfFiles: 1,
          },
        })
          .use(Audio)
          .use(Webcam)
          .use(XHRUpload, {
            limit: 1,
            method: "POST",
            endpoint: `${env.NEXT_PUBLIC_BACKEND_DOMAIN}/parties/workspace/${workspaceId}/file/${teamId}/${channelId}`,
            headers: {
              authorization: token,
            },
          })
          .on("complete", (e) => {
            let type = e.successful[0]?.type?.split("/")[0];

            if (type !== "audio" && type !== "video" && type !== "image") {
              type = "file";
            }

            // console.log("type", type, e);

            // const img = document.createElement("img");
            // img.style.display = "none";
            // img.src = e.successful[0]?.preview;
            // document.body.appendChild(img);
            // console.log(img.naturalWidth, img.naturalHeight);
            // document.body.removeChild(img);

            const name = e.successful[0]?.name;
            const fileId = e.successful[0]?.response?.body?.fileId as
              | string
              | undefined;

            completeUpload(fileId, type as Message["type"], name);
          })
          .on("dashboard:show-panel", () => {});
  }, [rep, token]);

  async function completeUpload(
    fileId?: string,
    type?: Message["type"],
    name?: string,
  ) {
    if (!user) {
      return;
    }

    if (!fileId || !type || !name) {
      return;
    }

    try {
      await rep?.mutate.sendMessage({
        sender: user.id,
        content: name,
        date: new Date().toISOString(),
        id: fileId,
        type,
        pollOptions: [],
        pollVoters: [],
        votes: [],
      });
    } catch {
      toast.error("Message send failed");
    }
  }

  if (!uppyRef) {
    return null;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <SidebarItemBtn Icon={Plus} className="" />
      </PopoverTrigger>
      <PopoverContent className="p-1">
        <Dashboard
          uppy={uppyRef}
          id="dashboard"
          height={240}
          width={240}
          className="simple flex justify-center "
        />
      </PopoverContent>
    </Popover>
  );
}

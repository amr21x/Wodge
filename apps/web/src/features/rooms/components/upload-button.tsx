"use client";

import type { ComponentProps } from "react";

import { FeatureGate } from "@/components/feature-flags-provider";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { SidebarItemBtn } from "../../workspace/components/sidebar-item-btn";
import { Plus } from "lucide-react";
import Uppy from "@uppy/core";
import { useState, useCallback, useRef, useEffect } from "react";
import XHRUpload from "@uppy/xhr-upload";
import { Dashboard } from "@uppy/react";

import { useCurrentUser } from "@/features/account/hooks/use-current-user";

import { Message } from "@wodge/domain/rooms/models";
import type { RoomMutators } from "@/client/sync/rooms/mutators";
import { Replicache } from "replicache";
import { env } from "@wodge/env/client";
import Webcam from "@uppy/webcam";

import Audio from "@uppy/audio";
import { toast } from "sonner";
import { failureMessage, reportAccessFailure } from "@/client/errors";
import { useUploadToken } from "../../workspace/components/use-upload-token";

function UploadButtonContent({
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

  const {
    data: token,
    error: tokenError,
    refetch: refreshToken,
  } = useUploadToken();

  const completeUpload = useCallback(
    async (fileId?: string, type?: Message["type"], name?: string) => {
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
    },
    [rep, user],
  );

  const tokenRef = useRef(token);
  tokenRef.current = token;
  const [uppyRef, setUppy] = useState<Uppy | null>(null);
  useEffect(() => {
    const instance = new Uppy({
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
        headers: () => ({ authorization: tokenRef.current ?? "" }),
      })
      .on("upload-error", (_file, _error, response) => {
        reportAccessFailure(response?.status ?? 0);
        toast.error(
          response?.status === 503
            ? "Uploads are currently unavailable. Your selected files have been kept."
            : "Upload failed. Check your access and connection, then try again.",
        );
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
    setUppy(instance);
    return () => instance.close();
  }, [channelId, completeUpload, workspaceId, teamId]);

  if (!token || !uppyRef) {
    return (
      <button
        type="button"
        className="p-2 text-xs"
        onClick={() => void refreshToken()}
      >
        {tokenError
          ? failureMessage(tokenError) + " Retry upload access"
          : "Loading upload access…"}
      </button>
    );
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
          className="simple flex justify-center"
        />
      </PopoverContent>
    </Popover>
  );
}

export function UploadButton(
  props: ComponentProps<typeof UploadButtonContent>,
) {
  return (
    <FeatureGate feature="attachments">
      <UploadButtonContent {...props} />
    </FeatureGate>
  );
}

"use client";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { SidebarItemBtn } from "../_components/sidebar-item-btn";
import { Plus } from "lucide-react";
import Uppy from "@uppy/core";
import { useEffect, useMemo, useRef, useState } from "react";
import XHRUpload from "@uppy/xhr-upload";
import { Dashboard } from "@uppy/react";
import { useParams } from "next/navigation";
import { env } from "@wodge/env";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery } from "@tanstack/react-query";
import { useUploadToken } from "../../use-upload-token";

export function AdvancedUploadButton({ workspaceId }: { workspaceId: string }) {
  const [open, setOpen] = useState(false);
  const [folder, setFolder] = useState<string>("");

  const inputRef = useRef<HTMLInputElement>(null);

  const { teamId, path } = useParams<{ teamId: string; path?: string[] }>();

  useEffect(() => {
    if (path) setFolder(path.join("/"));
  }, [path]);

  const token = useUploadToken();

  const uppyRef = useMemo(() => {
    return !token
      ? null
      : new Uppy({
          allowMultipleUploadBatches: true,
          restrictions: {
            allowedFileTypes: [
              "image/*",
              "text/*",
              "audio/*",
              "video/*",
              "application/*",
              ".ppsx",
            ],
            maxNumberOfFiles: 10,
          },
        }).use(XHRUpload, {
          limit: 1,
          formData: true,
          method: "POST",
          endpoint: `${env.NEXT_PUBLIC_BACKEND_DOMAIN}/parties/workspace/${workspaceId}/files/${teamId}`,
          headers: (file) => {
            const folder = inputRef.current?.value;
            const filePath = folder
              ? folder + "/" + file.name
              : path
                ? path.join("/") + "/" + file.name
                : file.name;

            const base64 = btoa(filePath);

            return {
              "x-file-path": base64,
              authorization: token,
            };
          },
        });
  }, [token]);

  if (!uppyRef) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <SidebarItemBtn Icon={Plus} className="" />
      </PopoverTrigger>
      <PopoverContent className="w-fit max-w-72 ">
        <Dashboard
          uppy={uppyRef}
          id="dashboard"
          height={"auto"}
          width={240}
          className="flex justify-center "
        />

        <div className="space-y-1">
          <Label htmlFor="file-path">File path</Label>
          <Input
            ref={inputRef}
            id="file-path"
            value={folder}
            onChange={(e) => setFolder(e.target.value)}
          />
          <p className="break-words pt-2 text-xs text-muted-foreground">
            Optionally you can provide a path for the file otherwise we will use
            the current active path.
          </p>
          <p className="break-words text-xs text-muted-foreground">
            For example "newFolder" will create a new folder called newFolder
            and the upload the file inside it.
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}

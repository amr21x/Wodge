import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils/index";
import { download } from "@/features/files/download";
import { useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";

import { Download, File as FileIcon, Trash2 } from "lucide-react";
import { env } from "@wodge/env/client";
import { SidebarItemBtn } from "../../workspace/components/sidebar-item-btn";
import { toast } from "@/components/ui/toast";
import { Checkbox } from "@/components/ui/checkbox";

export function File({
  name,
  curPath,
  wid,
}: {
  name: string;
  curPath?: string;
  wid: string;
}) {
  const { teamId } = useParams<{ teamId: string }>();

  const queryClient = useQueryClient();

  return (
    <div
      className={cn(
        buttonVariants({
          variant: "ghost",
          size: "sm",
        }),
        "group items-center justify-start gap-2 rounded-none py-4 ",
      )}
    >
      {/* <Checkbox className="mr-1.5" /> */}
      <FileIcon className="h-4 w-4" />
      <span>{name}</span>
      <SidebarItemBtn
        Icon={Download}
        className="ml-auto group-hover:visible md:invisible md:ml-2"
        onClick={async () => {
          // download file
          const path = curPath ? curPath + "/" : "";
          const url = `/api/workspaces/${wid}/file/${teamId}/${btoa(path + name)}`;

          await download(url);
        }}
      />
      <SidebarItemBtn
        Icon={Trash2}
        className="group-hover:visible md:invisible"
        onClick={async () => {
          const path = curPath ? curPath + "/" : "";

          try {
            const res = await fetch(
              `/api/workspaces/${wid}/file/${teamId}/${btoa(path + name)}`,
              {
                method: "DELETE",
              },
            );

            if (!res.ok) {
              throw new Error("Failed to delete file");
            }

            toast.success("File deleted successfully");
          } catch (e) {
            toast.error("Failed to delete file");
          }

          queryClient.invalidateQueries({
            queryKey: ["resources", teamId],
          });
        }}
      />
    </div>
  );
}

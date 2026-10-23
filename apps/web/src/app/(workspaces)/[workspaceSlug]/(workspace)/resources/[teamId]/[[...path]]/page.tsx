"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { useChannelPath } from "@/features/workspace/hooks/use-channel-path";
import { useCurrentResources } from "@/features/workspace/hooks/use-current-resources";
import { useCurrentWorkspace } from "@/features/workspace/state/workspace-provider";

import { AdvancedUploadButton } from "@/features/files/components/advanced-upload";

import { useRouter } from "next/navigation";
import { FoldersBreadcrumbs } from "@/features/files/components/folders-breadcrumbs";
import { useUpdateRecentlyVisited } from "@/features/workspace/hooks/use-recently-visited";
import { useIsTeamModerator } from "@/features/workspace/hooks/use-is-team-moderator";
import { Folders } from "../../../../../../../features/files/components/folders";
import { Files } from "../../../../../../../features/files/components/files";

function TeamResourcePage() {
  useUpdateRecentlyVisited("resources");

  const activePath = useChannelPath();

  const { workspaceId } = useCurrentWorkspace();

  useCurrentResources();

  useRouter();

  const isTeamModerator = useIsTeamModerator();

  if (!workspaceId) {
    return null;
  }

  // if ((files?.length === 0 || dirs?.length === 0) && path?.length > 0) {
  //   router.back();
  // }

  return (
    <div className="flex w-full flex-col px-4 py-3">
      <h2 className="text-xl">{activePath?.team.name} Resources</h2>
      <div className="flex h-8 items-center py-1.5">
        <FoldersBreadcrumbs />
        {isTeamModerator && (
          <div className="ml-1.5 shrink-0">
            <AdvancedUploadButton workspaceId={workspaceId} />
          </div>
        )}
      </div>

      <ScrollArea className="py-2.5">
        <div className="flex w-full flex-col divide-y-[1px]">
          <Folders workspaceId={workspaceId} />
          <Files workspaceId={workspaceId} />
        </div>
      </ScrollArea>
    </div>
  );
}

export default TeamResourcePage;

"use client";

import { useCurrentUser } from "@/features/account/hooks/use-current-user";

import { useParams } from "next/navigation";
import { useCurrentWorkspace } from "@/features/workspace/state/workspace-provider";
import { useUpdateRecentlyVisited } from "@/features/workspace/hooks/use-recently-visited";
import { PageEditor } from "../../../../../../../../features/pages/components/page-editor";

function ChannelPage() {
  useUpdateRecentlyVisited("page");
  const { user } = useCurrentUser();

  const { channelId, folderId, teamId } = useParams<{
    channelId: string;
    folderId: string;
    teamId: string;
  }>();

  const { workspaceId } = useCurrentWorkspace();

  if (!user || !workspaceId) {
    return null;
  }

  return (
    <div className="h-full w-full px-2 py-3">
      <PageEditor
        channelId={channelId}
        folderId={folderId}
        user={user}
        teamId={teamId}
        workspaceId={workspaceId}
      />
    </div>
  );
}

export default ChannelPage;

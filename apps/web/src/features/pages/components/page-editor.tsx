import BlockEditor from "@/features/editor/block-editor/block-editor";
import { useYDoc } from "@/features/pages/hooks/use-y-doc";
import type { UserType } from "@wodge/domain/user/models";

export function PageEditor({
  channelId,
  folderId,
  workspaceId,
  teamId,
  user,
}: {
  channelId: string;
  folderId: string;
  workspaceId: string;
  teamId: string;
  user: UserType;
}) {
  const collaboration = useYDoc({
    channelId,
    folderId,
    teamId,
    workspaceId,
  });

  if (!collaboration) return null;
  return (
    <BlockEditor
      ydoc={collaboration.provider.doc}
      provider={collaboration.provider}
      user={user}
    />
  );
}

import BlockEditor from "@/components/editor/block-editor/block-editor";
import { useYDoc } from "@/hooks/use-y-doc";
import { users } from "@wodge/data";

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
  user: typeof users.$inferSelect;
}) {
  const { provider } = useYDoc({
    channelId,
    folderId,
    teamId,
    workspaceId,
  });

  return <BlockEditor ydoc={provider.doc} provider={provider} user={user} />;
}

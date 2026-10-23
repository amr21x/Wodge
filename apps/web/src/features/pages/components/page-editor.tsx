import { useCanView } from "@/features/workspace/hooks/use-can-view";
import BlockEditor from "@/features/editor/block-editor/block-editor";
import { useYDoc } from "@/features/pages/hooks/use-y-doc";
import type { UserType } from "@wodge/domain/user/models";

function AuthorizedPageEditor({
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
    userId: user.id,
  });

  if (!collaboration) return null;
  return (
    <>
      {collaboration.connectionMessage && (
        <output className="p-2 text-sm text-muted-foreground">
          {collaboration.connectionMessage}
        </output>
      )}
      <BlockEditor
        ydoc={collaboration.provider.doc}
        provider={collaboration.provider}
        user={user}
      />
    </>
  );
}

export function PageEditor(props: Parameters<typeof AuthorizedPageEditor>[0]) {
  const canView = useCanView({ type: "page", forceChannelId: props.channelId });
  if (!canView)
    return (
      <output className="p-4">
        Page access is being checked or is unavailable. Pending local edits have
        been kept.
      </output>
    );
  return (
    <AuthorizedPageEditor
      key={`${props.user.id}:${props.workspaceId}:${props.channelId}`}
      {...props}
    />
  );
}

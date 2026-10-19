import type { RoomMutators } from "@/client/sync/rooms/mutators";
import { FeatureGate } from "@/components/feature-flags-provider";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { useCurrentUser } from "@/features/account/hooks/use-current-user";
import OfflineEditor from "@/features/editor/block-editor/offline-editor";
import { useMessageEditor } from "@/features/rooms/hooks/use-message-editor";
import { useCanEdit } from "@/features/workspace/hooks/use-can-edit";
import { useCurrentWorkspace } from "@/features/workspace/state/workspace-provider";
import { createEntityId } from "@wodge/domain/identifiers";
import { SendHorizonal, Vote } from "lucide-react";
import { useParams } from "next/navigation";
import { Replicache } from "replicache";
import { toast } from "sonner";
import { PollMaker } from "../../polls/components/poll-maker";
import { SidebarItemBtn } from "../../workspace/components/sidebar-item-btn";
import { UploadButton } from "./upload-button";

export function MessageEditor({ rep }: { rep?: Replicache<RoomMutators> }) {
  const editor = useMessageEditor({});
  const { user } = useCurrentUser();
  const { workspaceId } = useCurrentWorkspace();

  const { channelId, teamId } = useParams<{
    channelId: string;
    teamId: string;
  }>();

  const canEdit = useCanEdit({
    type: "room",
  });

  async function onSubmit() {
    if (editor) {
      if (editor.isEmpty) {
        return;
      }

      const content = editor.getHTML();

      if (!content || !user) {
        return;
      }

      try {
        await rep?.mutate.sendMessage({
          sender: user.id,
          content: content,
          date: new Date().toISOString(),
          id: createEntityId(),
          type: "text",
          pollOptions: [],
          pollVoters: [],
          votes: [],
        });

        editor.commands.clearContent();
      } catch {
        toast.error("Message send failed");
      }
    }
  }

  return (
    <div className=" flex h-12 shrink-0 items-end  overflow-hidden border-t border-border/50 bg-dim px-3.5 pb-2.5 pt-2">
      {!canEdit && (
        <p className="text-muted-foreground">
          Your are not allowed to send messages in this room.
        </p>
      )}
      {canEdit && (
        <>
          <UploadButton
            workspaceId={workspaceId}
            channelId={channelId}
            teamId={teamId}
            rep={rep}
          />
          <FeatureGate feature="polls">
            <Dialog>
              <DialogTrigger asChild>
                <SidebarItemBtn
                  className="ml-0.5 mr-2"
                  Icon={Vote}
                  iconClassName="w-4 h-4"
                />
              </DialogTrigger>
              <DialogContent>
                <PollMaker isRoom />
              </DialogContent>
            </Dialog>
          </FeatureGate>
          <div
            className="flex  w-full items-center overflow-hidden"
            onKeyDown={(e) => {
              if (e.code === "Enter" && !e.shiftKey && !e.ctrlKey) {
                onSubmit();
              }
            }}
          >
            <OfflineEditor editor={editor} />
          </div>
          <SidebarItemBtn
            Icon={SendHorizonal}
            className="ml-2"
            onClick={onSubmit}
            disabled={editor?.isEmpty}
          />
        </>
      )}
    </div>
  );
}

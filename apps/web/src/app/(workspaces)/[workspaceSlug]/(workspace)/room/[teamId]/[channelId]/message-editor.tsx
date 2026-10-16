import OfflineEditor from "@/components/editor/block-editor/offline-editor";
import { UploadButton } from "../../upload-button";
import { SidebarItemBtn } from "../../../_components/sidebar-item-btn";
import { Send, SendHorizonal, Vote } from "lucide-react";
import { useMessageEditor } from "@/hooks/use-message-editor";
import { useCurrentWorkspace } from "@/components/workspace-provider";
import { useParams } from "next/navigation";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useCanEdit } from "@/hooks/use-can-edit";
import { Replicache } from "replicache";
import { roomMutators } from "@wodge/data/browser";
import { nanoid } from "nanoid";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { PollMaker } from "../../../../../../../components/poll-maker";
import { toast } from "sonner";

export function MessageEditor({
  rep,
}: {
  rep?: Replicache<typeof roomMutators>;
}) {
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
      if (editor.isEmpty) return;

      const content = editor.getHTML();
      if (!content || !user) return;

      try {
        await rep?.mutate.sendMessage({
          sender: user.id,
          content: content,
          date: new Date().toISOString(),
          id: nanoid(),
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

import { SafeDiv } from "@/components/safe-div";
import { SidebarItemBtn } from "@/app/(workspaces)/[workspaceSlug]/(workspace)/_components/sidebar-item-btn";
import { Thread, ThreadMessage, ThreadPost } from "@wodge/data";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useEffect } from "react";
import { useThreadEditor } from "@/hooks/use-thread-editor";
import OfflineEditor from "@/components/editor/block-editor/offline-editor";

export function EditEditor({
  isQA = false,
  content,
  onSuccessEdit,
  onCancelEdit,
}: {
  isQA?: boolean;
  content: ThreadPost | ThreadMessage;
  onSuccessEdit?: (text: string) => void;

  onCancelEdit?: () => void;
}) {
  const { user } = useCurrentUser();

  const editor = useThreadEditor({
    content: content.content,
    placeholder: isQA ? "What's your question?" : "What's happening?",
  });

  async function editThread() {
    const text = editor?.getHTML();
    if (!text || !user) return;

    onSuccessEdit?.(text);
  }

  useEffect(() => {
    if (editor && !editor.isFocused) editor.chain().focus("end").run();
  }, [editor]);

  return (
    <div className="flex w-full flex-1 flex-col bg-transparent p-0">
      <div
        className="flex h-full w-full items-start"
        onKeyDown={(e) => {
          if (e.key === "Enter" && e.ctrlKey) {
            editThread();
          }
        }}
      >
        {!editor && <SafeDiv className="BlockEditor" html={content.content} />}
        <OfflineEditor editor={editor} isThread className="w-full" />
      </div>
      <div className="ml-0.5 flex items-center py-1.5 pl-8">
        <Button
          size="fit"
          variant="secondary"
          className="ml-auto mr-1.5 w-20"
          onClick={() => onCancelEdit?.()}
        >
          Cancel
        </Button>
        <Button
          size="fit"
          className="w-20"
          disabled={editor?.isEmpty}
          onClick={editThread}
        >
          Save
        </Button>
      </div>
    </div>
  );
}

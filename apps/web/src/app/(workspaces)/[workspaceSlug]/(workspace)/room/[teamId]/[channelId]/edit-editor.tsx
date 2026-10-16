import { SafeDiv } from "@/components/safe-div";
import { Message } from "@wodge/data";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useEffect } from "react";
import { useMessageEditor } from "@/hooks/use-message-editor";
import OfflineEditor from "@/components/editor/block-editor/offline-editor";

export function EditEditor({
  content,
  onSuccessEdit,
  onCancelEdit,
}: {
  content: Message;
  onSuccessEdit?: (text: string) => void;
  onCancelEdit?: () => void;
}) {
  const { user } = useCurrentUser();

  const editor = useMessageEditor({
    content: content.content,
  });

  async function editMessage() {
    const text = editor?.getHTML();
    if (!text || !user) return;

    onSuccessEdit?.(text);
  }

  useEffect(() => {
    if (editor && !editor.isFocused) editor.chain().focus("end").run();
  }, [editor]);

  return (
    <div className="flex flex-col overflow-hidden bg-transparent p-0">
      <div
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            editMessage();
          }
        }}
      >
        {!editor && (
          <SafeDiv className="MessageEditor" html={content.content} />
        )}
        <OfflineEditor editor={editor} />
      </div>

      <div className="flex w-full items-center self-end py-2">
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
          onClick={editMessage}
        >
          Save
        </Button>
      </div>
    </div>
  );
}

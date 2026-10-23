import { SafeDiv } from "@/components/safe-div";
import { Message } from "@wodge/domain/rooms/models";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/features/account/hooks/use-current-user";
import { useEffect } from "react";
import { useMessageEditor } from "@/features/rooms/hooks/use-message-editor";
import OfflineEditor from "@/features/editor/block-editor/offline-editor";

export function EditEditor({
  content,
  canEdit,
  onSuccessEdit,
  onCancelEdit,
}: {
  content: Message;
  canEdit: boolean;
  onSuccessEdit?: (text: string) => void;
  onCancelEdit?: () => void;
}) {
  const { user } = useCurrentUser();

  const editor = useMessageEditor({
    content: content.content,
  });

  async function editMessage() {
    const text = editor?.getHTML();

    if (!text || !user || !canEdit) {
      return;
    }

    onSuccessEdit?.(text);
  }

  useEffect(() => {
    editor?.setEditable(canEdit);
  }, [editor, canEdit]);

  useEffect(() => {
    if (editor && !editor.isFocused) {
      editor.chain().focus("end").run();
    }
  }, [editor]);

  return (
    <div className="flex flex-col overflow-hidden bg-transparent p-0">
      {/* oxlint-disable-next-line jsx-a11y/no-static-element-interactions -- Keyboard shortcuts bubble from the nested editor, which owns focus and textbox semantics. */}
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
          disabled={!canEdit || editor?.isEmpty}
          onClick={editMessage}
        >
          Save
        </Button>
      </div>
    </div>
  );
}

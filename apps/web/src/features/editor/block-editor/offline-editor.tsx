"use client";

import { cn } from "@/lib/utils/index";
import { Editor, EditorContent } from "@tiptap/react";
import { memo, useRef } from "react";
import { LinkMenu } from "../link-menu/link-menu";
import { TextMenu } from "../text-menu/text-menu";
import ColumnsMenu from "../extensions/multi-column/columns-menu";
import TableRowMenu from "../extensions/table/table-row/index";
import TableColumnMenu from "../extensions/table/table-column/index";
import ImageBlockMenu from "../extensions/image-block/image-block-menu";

export const OfflineEditor = memo(
  ({
    editor,
    isThread = false,
    className,
  }: {
    editor: Editor | null;
    isThread?: boolean;
    className?: string;
  }) => {
    const menuContainerRef = useRef(null);
    const editorRef = useRef<HTMLDivElement | null>(null);

    if (!editor) {
      return null;
    }

    return (
      <div
        className={cn(
          "flex h-full w-full flex-col overflow-y-auto",
          !isThread && "max-h-16",
          className,
        )}
        ref={menuContainerRef}
      >
        <div className="relative flex h-full flex-1 flex-col">
          <EditorContent
            editor={editor}
            ref={editorRef}
            className="w-full flex-1"
          />
          <LinkMenu editor={editor} appendTo={menuContainerRef} />
          <TextMenu editor={editor} />
          <ColumnsMenu editor={editor} appendTo={menuContainerRef} />
          <TableRowMenu editor={editor} appendTo={menuContainerRef} />
          <TableColumnMenu editor={editor} appendTo={menuContainerRef} />
          <ImageBlockMenu editor={editor} appendTo={menuContainerRef} />
        </div>
      </div>
    );
  },
);

export default OfflineEditor;

"use client";

import { useFeatureFlags } from "@/components/feature-flags-provider";

import { EditorContent } from "@tiptap/react";
import React, { memo, useEffect, useMemo, useRef } from "react";
import { TiptapProps } from "./types";
import type { UserType } from "@wodge/domain/user/models";
import { useBlockEditor } from "@/features/editor/hooks/use-block-editor";
import { useCanEdit } from "@/features/workspace/hooks/use-can-edit";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ContentItemMenu } from "../content-item-menu/content-item-menu";
import { LinkMenu } from "../link-menu/link-menu";
import { TextMenu } from "../text-menu/text-menu";
import ColumnsMenu from "../extensions/multi-column/columns-menu";
import TableRowMenu from "../extensions/table/table-row/index";
import TableColumnMenu from "../extensions/table/table-column/index";
import ImageBlockMenu from "../extensions/image-block/image-block-menu";

import { useSetAtom } from "jotai";
import { editorUsersAtoms } from "./atoms";

export const BlockEditor = ({
  ydoc,
  provider,
  user,
}: TiptapProps & {
  user: UserType;
}) => {
  const flags = useFeatureFlags();
  const menuContainerRef = useRef(null);
  const editorRef = useRef<HTMLDivElement | null>(null);

  const { editor, users, characterCount } = useBlockEditor({
    ydoc,
    provider,
    user,
  });

  if (editor) editor.storage.featureFlags = flags;

  const setUserEditors = useSetAtom(editorUsersAtoms);

  const canEdit = useCanEdit({ type: "page" });

  useEffect(() => {
    if (editor) {
      editor.setEditable(canEdit);
    }
  }, [canEdit, editor]);

  const displayedUsers = users.slice(0, 5);

  useEffect(() => {
    setUserEditors(displayedUsers);
  }, [displayedUsers]);

  if (!editor) {
    return null;
  }

  return (
    <div className="flex h-full w-full flex-col" ref={menuContainerRef}>
      <div className="relative flex h-full flex-1 flex-col">
        <EditorContent
          editor={editor}
          ref={editorRef}
          className="w-full flex-1"
        />
        <ContentItemMenu editor={editor} />
        <LinkMenu editor={editor} appendTo={menuContainerRef} />
        <TextMenu editor={editor} />
        <ColumnsMenu editor={editor} appendTo={menuContainerRef} />
        <TableRowMenu editor={editor} appendTo={menuContainerRef} />
        <TableColumnMenu editor={editor} appendTo={menuContainerRef} />
        <ImageBlockMenu editor={editor} appendTo={menuContainerRef} />
      </div>
    </div>
  );
};

export default memo(BlockEditor);

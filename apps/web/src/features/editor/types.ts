import React from "react";
import { Editor as CoreEditor } from "@tiptap/core";
import { Editor } from "@tiptap/react";
import { EditorState } from "@tiptap/pm/state";
import { EditorView } from "@tiptap/pm/view";

export interface MenuProps {
  editor: Editor;
  appendTo?: React.RefObject<any>;
  shouldHide?: boolean;
}

export interface ShouldShowProps {
  editor?: CoreEditor;
  view: EditorView;
  state?: EditorState;
  oldState?: EditorState;
  from?: number;
  to?: number;
}

/** Fields displayed by the editor outline. */
export interface OutlineItem {
  id: string;
  level: number;
  isActive: boolean;
  itemIndex: number;
  textContent: string;
}

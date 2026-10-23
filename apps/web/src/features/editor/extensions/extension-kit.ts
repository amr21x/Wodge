"use client";

import { lowlight } from "lowlight";

import { StarterKit } from "@tiptap/starter-kit";
import { Highlight } from "@tiptap/extension-highlight";
import { CharacterCount } from "@tiptap/extension-character-count";
import { Underline } from "@tiptap/extension-underline";
import { Placeholder } from "@tiptap/extension-placeholder";
import { Emoji, gitHubEmojis } from "@tiptap/extension-emoji";
import { TextAlign } from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import { FontFamily } from "@tiptap/extension-font-family";
import { Typography } from "@tiptap/extension-typography";
import { Color } from "@tiptap/extension-color";
import { FocusClasses as Focus } from "@tiptap/extension-focus";
import { Dropcursor } from "@tiptap/extension-dropcursor";
import { Subscript } from "@tiptap/extension-subscript";
import { Superscript } from "@tiptap/extension-superscript";
import { TaskItem } from "@tiptap/extension-task-item";
import { TaskList } from "@tiptap/extension-task-list";
import { FileHandler } from "@tiptap/extension-file-handler";
import { CodeBlockLowlight } from "@tiptap/extension-code-block-lowlight";

import { Table } from "./table/table";
import { TableCell } from "./table/cell";
import { TableHeader } from "./table/header";
import { TableRow } from "./table/row";
import { HorizontalRule } from "./horizontal-rule/horizontal-rule";
import { Heading } from "./heading/heading";
import { Document } from "./document/document";
import { TrailingNode } from "./trailing-node/trailing-node";
import { SlashCommand } from "./slash-command/slash-command";
import { FontSize } from "./font-size/font-size";

import { Figcaption } from "./fig-caption/fig-caption";
import { BlockquoteFigure } from "./blockquote-figure/blockquote-figure";
import { Link } from "./link/link";
import { ImageUpload } from "./image-upload/image-upload";
import { ImageBlock } from "./image-block/image-block";
import { Columns } from "./multi-column/columns";
import { Column } from "./multi-column/column";
import { emojiSuggestion } from "./emoji-suggestions/suggestion";
import { TasksDB } from "./tasks/index";

interface ExtensionKitProps {
  placeholder?: string;
}

const ExtensionKit = ({ placeholder }: ExtensionKitProps) => [
  Document,
  Columns,
  TaskList,
  TaskItem.configure({
    nested: true,
  }),
  Column,
  // Selection,
  Heading,
  HorizontalRule,
  TasksDB,
  StarterKit.configure({
    document: false,
    dropcursor: false,
    heading: false,
    horizontalRule: false,
    blockquote: false,
    history: false,
    codeBlock: false,
  }),
  CodeBlockLowlight.configure({
    lowlight,
    defaultLanguage: null,
  }),
  TextStyle,
  FontSize,
  FontFamily,
  Color,
  TrailingNode,
  Link.configure({
    openOnClick: false,
  }),
  Highlight.configure({ multicolor: true }),
  Underline,
  CharacterCount.configure({ limit: 50000 }),
  ImageUpload,
  ImageBlock,
  FileHandler.configure({
    allowedMimeTypes: ["image/png", "image/jpeg", "image/gif", "image/webp"],
  }),
  Emoji.configure({
    enableEmoticons: true,
    emojis: gitHubEmojis,
    suggestion: emojiSuggestion,
  }),
  TextAlign.extend({
    addKeyboardShortcuts() {
      return {};
    },
  }).configure({
    types: ["heading", "paragraph"],
  }),
  Subscript,
  Superscript,
  Table,
  TableCell,
  TableHeader,
  TableRow,
  Typography,
  Placeholder.configure({
    includeChildren: true,
    showOnlyCurrent: false,
    placeholder: placeholder || "Type / for commands",
  }),
  SlashCommand,
  Focus,
  Figcaption,
  BlockquoteFigure,
  Dropcursor.configure({
    width: 2,
    class: "ProseMirror-dropcursor border-black",
  }),
];

export default ExtensionKit;

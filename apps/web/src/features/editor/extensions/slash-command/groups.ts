import {
  Book,
  Columns,
  Heading1,
  Heading2,
  Heading3,
  Image,
  Kanban,
  List,
  ListOrdered,
  ListTodo,
  Minus,
  Quote,
  SquareCode,
  Table,
} from "lucide-react";
import { Group } from "./types";

export const GROUPS: Group[] = [
  {
    name: "format",
    title: "Format",
    commands: [
      {
        name: "heading1",
        label: "Heading 1",
        icon: Heading1,
        description: "High priority section title",
        aliases: ["h1"],
        action: (editor) => {
          editor.chain().focus().setHeading({ level: 1 }).run();
        },
      },
      {
        name: "heading2",
        label: "Heading 2",
        icon: Heading2,
        description: "Medium priority section title",
        aliases: ["h2"],
        action: (editor) => {
          editor.chain().focus().setHeading({ level: 2 }).run();
        },
      },
      {
        name: "heading3",
        label: "Heading 3",
        icon: Heading3,
        description: "Low priority section title",
        aliases: ["h3"],
        action: (editor) => {
          editor.chain().focus().setHeading({ level: 3 }).run();
        },
      },
      {
        name: "bulletList",
        label: "Bullet List",
        icon: List,
        description: "Unordered list of items",
        aliases: ["ul"],
        action: (editor) => {
          editor.chain().focus().toggleBulletList().run();
        },
      },
      {
        name: "numberedList",
        label: "Numbered List",
        icon: ListOrdered,
        description: "Ordered list of items",
        aliases: ["ol"],
        action: (editor) => {
          editor.chain().focus().toggleOrderedList().run();
        },
      },
      {
        name: "taskList",
        label: "Task List",
        icon: ListTodo,
        description: "Task list with todo items",
        aliases: ["todo"],
        action: (editor) => {
          editor.chain().focus().toggleTaskList().run();
        },
      },
      {
        name: "blockquote",
        label: "Blockquote",
        icon: Quote,
        description: "Element for quoting",
        action: (editor) => {
          editor.chain().focus().setBlockquote().run();
        },
      },
      {
        name: "codeBlock",
        label: "Code Block",
        icon: SquareCode,
        description: "Code block with syntax highlighting",
        shouldBeHidden: (editor) => editor.isActive("columns"),
        action: (editor) => {
          editor.chain().focus().setCodeBlock().run();
        },
      },
    ],
  },
  {
    name: "insert",
    title: "Insert",
    commands: [
      {
        name: "table",
        label: "Table",
        icon: Table,
        description: "Insert a table",
        shouldBeHidden: (editor) => editor.isActive("columns"),
        action: (editor) => {
          editor
            .chain()
            .focus()
            .insertTable({ rows: 3, cols: 3, withHeaderRow: false })
            .run();
        },
      },
      {
        name: "image",
        label: "Image",
        icon: Image,
        description: "Insert an image",
        aliases: ["img"],
        action: (editor) => {
          editor.chain().focus().setImageUpload().run();
        },
      },
      {
        name: "columns",
        label: "Columns",
        icon: Columns,
        description: "Add two column content",
        aliases: ["cols"],
        shouldBeHidden: (editor) => editor.isActive("columns"),
        action: (editor) => {
          editor
            .chain()
            .focus()
            .setColumns()
            .focus(editor.state.selection.head - 1)
            .run();
        },
      },
      {
        name: "horizontalRule",
        label: "Horizontal Rule",
        icon: Minus,
        description: "Insert a horizontal divider",
        aliases: ["hr"],
        action: (editor) => {
          editor.chain().focus().setHorizontalRule().run();
        },
      },
      {
        name: "toc",
        label: "Table of Contents",
        icon: Book,
        aliases: ["outline"],
        description: "Insert a table of contents",
        shouldBeHidden: (editor) => editor.isActive("columns"),
        action: (editor) => {
          editor.chain().focus().insertTableOfContents().run();
        },
      },
      {
        name: "tasksDb",
        label: "Tasks DB",
        icon: Kanban,
        description: "Insert a kanban board",
        shouldBeHidden: (editor) => editor.isActive("columns"),
        action: (editor) => {
          editor.chain().focus().insertContent({ type: "tasks-db" }).run();
        },
      },
    ],
  },
];

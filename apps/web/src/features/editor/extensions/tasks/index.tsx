import { mergeAttributes, Node } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { createEntityId } from "@wodge/domain/identifiers";

import { atom } from "jotai";
import * as Y from "yjs";
import { Tasks as TasksComp } from "./tasks";

export const yDocAtom = atom<Y.Doc | undefined>(undefined);

export const TasksDB = Node.create({
  name: "tasks-db",
  group: "block",
  isolating: true,
  selectable: false,

  defining: true,

  parseHTML() {
    return [
      {
        tag: "tasks-db",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["tasks-db", mergeAttributes(HTMLAttributes)];
  },
  addNodeView() {
    return ReactNodeViewRenderer(TasksComp);
  },

  addAttributes() {
    return {
      "data-id": {
        default: createEntityId(),
      },
    };
  },

  addStorage() {
    return {
      id: createEntityId(),
    };
  },
});

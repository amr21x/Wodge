import { Editor } from "@tiptap/react";
import { HorizontalRule } from "../extensions/horizontal-rule/horizontal-rule";
import { ImageBlock } from "../extensions/image-block/image-block";
import { ImageUpload } from "../extensions/image-upload/image-upload";
import CodeBlock from "@tiptap/extension-code-block";
import { Link } from "../extensions/link/link";
import { Figcaption } from "../extensions/fig-caption/fig-caption";
import { TableOfContentsNode } from "../extensions/table-of-contents/table-of-contents";

export const isTableGripSelected = (node: HTMLElement) => {
  let container = node;

  while (container && !["TD", "TH"].includes(container.tagName)) {
    container = container.parentElement!;
  }

  const gripColumn =
    container &&
    container.querySelector &&
    container.querySelector("a.grip-column.selected");
  const gripRow =
    container &&
    container.querySelector &&
    container.querySelector("a.grip-row.selected");

  if (gripColumn || gripRow) {
    return true;
  }

  return false;
};

export const isCustomNodeSelected = (editor: Editor, node: HTMLElement) => {
  const customNodes = [
    HorizontalRule.name,
    ImageBlock.name,
    ImageUpload.name,
    CodeBlock.name,
    ImageBlock.name,
    Link.name,
    Figcaption.name,
    TableOfContentsNode.name,
  ];

  return (
    customNodes.some((type) => editor.isActive(type)) ||
    isTableGripSelected(node)
  );
};

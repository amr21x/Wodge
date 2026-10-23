import { cn } from "@/lib/utils/index";

import { NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/core";
import { useCallback, useRef } from "react";

export const ImageBlockView = (props: NodeViewProps) => {
  const { editor, getPos, node } = props;
  const imageWrapperRef = useRef<HTMLDivElement>(null);
  const { src } = node.attrs;

  const wrapperClassName = cn(
    node.attrs.align === "left" ? "ml-0" : "ml-auto",
    node.attrs.align === "right" ? "mr-0" : "mr-auto",
    node.attrs.align === "center" && "mx-auto",
  );

  const onClick = useCallback(() => {
    editor.commands.setNodeSelection(getPos());
  }, [getPos, editor.commands]);

  return (
    <NodeViewWrapper>
      <div className={wrapperClassName} style={{ width: node.attrs.width }}>
        <div contentEditable={false} ref={imageWrapperRef}>
          <button
            type="button"
            className="block w-full border-0 bg-transparent p-0"
            aria-label="Select image"
            onClick={onClick}
          >
            {/* oxlint-disable next/no-img-element -- User-provided or blob image URLs have no fixed dimensions or image-optimizer contract. */}
            <img className="block" src={src} alt="" />
            {/* oxlint-enable next/no-img-element */}
          </button>
        </div>
      </div>
    </NodeViewWrapper>
  );
};

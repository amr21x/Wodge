import { Editor, NodeViewWrapper } from "@tiptap/react";
import { memo, useCallback } from "react";

import { ImageUploader } from "./image-uploader";

export const ImageUploadComp = ({
  getPos,
  editor,
}: {
  getPos: () => number;
  editor: Editor;
}) => {
  const onUpload = useCallback(
    (url: string) => {
      if (url) {
        editor
          .chain()
          .deleteRange({ from: getPos(), to: getPos() })
          .setImageBlock({ src: url })
          .focus()
          .run();
      }
    },
    [getPos, editor],
  );

  return (
    <NodeViewWrapper>
      <div className="m-0 p-0" data-drag-handle>
        <ImageUploader onUpload={onUpload} />
      </div>
    </NodeViewWrapper>
  );
};

export default ImageUploadComp;

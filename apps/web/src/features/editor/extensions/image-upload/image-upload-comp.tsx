import { FeatureGate } from "@/components/feature-flags-provider";
import { Editor, NodeViewWrapper } from "@tiptap/react";
import { useCallback } from "react";

import { UPLOADS_DISABLED } from "@/features/files/components/uploads-disabled-button";
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
        <FeatureGate
          feature="attachments"
          fallback={
            <p className="text-sm text-muted-foreground">{UPLOADS_DISABLED}</p>
          }
        >
          <ImageUploader onUpload={onUpload} />
        </FeatureGate>
      </div>
    </NodeViewWrapper>
  );
};

export default ImageUploadComp;

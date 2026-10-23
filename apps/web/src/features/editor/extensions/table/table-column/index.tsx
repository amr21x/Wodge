import { BubbleMenu as BaseBubbleMenu } from "@tiptap/react";
import React, { useCallback } from "react";
import { ArrowLeftToLine, ArrowRightToLine } from "lucide-react";
import { MenuProps, ShouldShowProps } from "@/features/editor/types";
import isColumnGripSelected from "./utils";
import { Toolbar } from "@/features/editor/ui/toolbar";
import * as PopoverMenu from "@/features/editor/ui/popover-menu";
import { Icon } from "@/features/editor/ui/icon";

const TableColumnMenu = React.memo(
  ({ editor, appendTo }: MenuProps): JSX.Element => {
    const shouldShow = useCallback(
      ({ view, state, from }: ShouldShowProps) => {
        if (!state) {
          return false;
        }

        return isColumnGripSelected({ editor, view, state, from: from || 0 });
      },
      [editor],
    );

    const onAddColumnBefore = useCallback(() => {
      editor.chain().focus().addColumnBefore().run();
    }, [editor]);

    const onAddColumnAfter = useCallback(() => {
      editor.chain().focus().addColumnAfter().run();
    }, [editor]);

    const onDeleteColumn = useCallback(() => {
      editor.chain().focus().deleteColumn().run();
    }, [editor]);

    return (
      <BaseBubbleMenu
        editor={editor}
        pluginKey="tableColumnMenu"
        updateDelay={0}
        tippyOptions={{
          appendTo: () => {
            return appendTo?.current;
          },
          offset: [0, 15],
          popperOptions: {
            modifiers: [{ name: "flip", enabled: false }],
          },
        }}
        shouldShow={shouldShow}
      >
        <Toolbar.Wrapper isVertical>
          <PopoverMenu.Item
            iconComponent={<Icon Icon={ArrowLeftToLine} />}
            close={false}
            label="Add column before"
            onClick={onAddColumnBefore}
          />
          <PopoverMenu.Item
            iconComponent={<Icon Icon={ArrowRightToLine} />}
            close={false}
            label="Add column after"
            onClick={onAddColumnAfter}
          />
          <PopoverMenu.Item
            icon="Trash"
            close={false}
            label="Delete column"
            onClick={onDeleteColumn}
          />
        </Toolbar.Wrapper>
      </BaseBubbleMenu>
    );
  },
);

export default TableColumnMenu;

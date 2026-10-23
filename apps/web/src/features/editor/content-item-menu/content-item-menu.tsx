import DragHandle from "@tiptap/extension-drag-handle-react";
import { Editor } from "@tiptap/react";

import useContentItemActions from "./use-content-item-actions";
import { useData } from "./use-data";
import { useEffect, useState } from "react";
import {
  Clipboard,
  Copy,
  GripVertical,
  Plus,
  RemoveFormatting,
  Trash2,
} from "lucide-react";
import {
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Toolbar } from "../ui/toolbar";
import { Icon } from "../ui/icon";
import { DropdownButton } from "../ui/Dropdown/Dropdown";

type ContentItemMenuProps = {
  editor: Editor;
};

const dragHandleOptions = { offset: [-2, 0] as [number, number] };

export const ContentItemMenu = ({ editor }: ContentItemMenuProps) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const data = useData();
  const actions = useContentItemActions(
    editor,
    data.currentNode,
    data.currentNodePos,
  );

  useEffect(() => {
    if (menuOpen) {
      editor.commands.setMeta("lockDragHandle", true);
    } else {
      editor.commands.setMeta("lockDragHandle", false);
    }
  }, [editor, menuOpen]);

  // The plugin moves its element; retain a React-owned parent for safe unmounting.
  return (
    <div className="contents">
      <DragHandle
        pluginKey="ContentItemMenu"
        className="pr-2"
        editor={editor}
        onNodeChange={data.handleNodeChange}
        tippyOptions={dragHandleOptions}
      >
        <div className="flex items-center gap-0.5">
          <Toolbar.Button onClick={actions.handleAdd}>
            <Icon Icon={Plus} />
          </Toolbar.Button>

          <Popover open={menuOpen} onOpenChange={setMenuOpen}>
            <PopoverTrigger asChild>
              <Toolbar.Button>
                <Icon Icon={GripVertical} />
              </Toolbar.Button>
            </PopoverTrigger>
            <PopoverContent
              side="bottom"
              align="start"
              sideOffset={8}
              className="flex min-w-[16rem] flex-col p-2"
            >
              <PopoverClose asChild>
                <DropdownButton onClick={actions.resetTextFormatting}>
                  <Icon Icon={RemoveFormatting} />
                  Clear formatting
                </DropdownButton>
              </PopoverClose>
              <PopoverClose asChild>
                <DropdownButton onClick={actions.copyNodeToClipboard}>
                  <Icon Icon={Clipboard} />
                  Copy to clipboard
                </DropdownButton>
              </PopoverClose>
              <PopoverClose asChild>
                <DropdownButton onClick={actions.duplicateNode}>
                  <Icon Icon={Copy} />
                  Duplicate
                </DropdownButton>
              </PopoverClose>
              <Toolbar.Divider horizontal />
              <PopoverClose asChild>
                <DropdownButton
                  onClick={actions.deleteNode}
                  className="bg-red-500 bg-opacity-10 text-red-500 hover:bg-red-500 hover:bg-opacity-20 dark:text-red-500 dark:hover:bg-red-500 dark:hover:bg-opacity-20 dark:hover:text-red-500"
                >
                  <Icon Icon={Trash2} />
                  Delete
                </DropdownButton>
              </PopoverClose>
            </PopoverContent>
          </Popover>
        </div>
      </DragHandle>
    </div>
  );
};

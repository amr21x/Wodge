import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Link } from "lucide-react";
import { Toolbar } from "../ui/toolbar";
import { Icon } from "../ui/icon";
import { LinkEditorPanel } from "../link-editor-panel";

export type EditLinkPopoverProps = {
  onSetLink: (link: string, openInNewTab?: boolean) => void;
};

export const EditLinkPopover = ({ onSetLink }: EditLinkPopoverProps) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Toolbar.Button tooltip="Set Link">
          <Icon Icon={Link} />
        </Toolbar.Button>
      </PopoverTrigger>
      <PopoverContent>
        <LinkEditorPanel onSetLink={onSetLink} />
      </PopoverContent>
    </Popover>
  );
};

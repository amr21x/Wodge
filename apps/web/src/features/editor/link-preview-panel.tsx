import { Icon } from "./ui/icon";
import { Surface } from "./ui/surface";
import { Toolbar } from "./ui/toolbar";
import Tooltip from "./ui/Tooltip/index";
import { Pen, Trash2 } from "lucide-react";

export type LinkPreviewPanelProps = {
  url: string;
  onEdit: () => void;
  onClear: () => void;
};

export const LinkPreviewPanel = ({
  onClear,
  onEdit,
  url,
}: LinkPreviewPanelProps) => {
  return (
    <Surface className="flex items-center gap-2 p-2">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm underline"
      >
        {url}
      </a>
      <Toolbar.Divider />
      <Tooltip title="Edit link">
        <Toolbar.Button onClick={onEdit}>
          <Icon Icon={Pen} />
        </Toolbar.Button>
      </Tooltip>
      <Tooltip title="Remove link">
        <Toolbar.Button onClick={onClear}>
          <Icon Icon={Trash2} />
        </Toolbar.Button>
      </Tooltip>
    </Surface>
  );
};

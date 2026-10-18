import type {
  CaptureOptionsBySource,
  ToggleSource,
} from "@livekit/components-core";
import * as React from "react";
import { TrackPublishOptions } from "livekit-client";
import { useTrackToggle } from "@livekit/components-react";
import { Button } from "@/components/ui/button";

export interface TrackToggleProps<T extends ToggleSource>
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> {
  source: T;
  showIcon?: boolean;
  initialState?: boolean;

  onChange?: (enabled: boolean, isUserInitiated: boolean) => void;
  captureOptions?: CaptureOptionsBySource<T>;
  publishOptions?: TrackPublishOptions;
}

export const TrackToggle = /* @__PURE__ */ React.forwardRef(
  function TrackToggle<T extends ToggleSource>(
    { showIcon, ...props }: TrackToggleProps<T>,
    ref: React.ForwardedRef<HTMLButtonElement>,
  ) {
    const { buttonProps, enabled } = useTrackToggle(props);

    return (
      <Button
        ref={ref}
        {...buttonProps}
        variant="secondary"
        size="fit"
        className="rounded-full p-3.5"
      >
        {props.children}
      </Button>
    );
  },
);

import * as React from "react";
import type { TrackReferenceOrPlaceholder } from "@livekit/components-core";
import { Track } from "livekit-client";
import { useTrackMutedIndicator } from "@livekit/components-react";
import { mergeProps } from "./merge-props";
import {
  Mic,
  MicOff,
  ScreenShare,
  ScreenShareOff,
  Video,
  VideoOff,
} from "lucide-react";

/** @public */
export interface TrackMutedIndicatorProps
  extends React.HTMLAttributes<HTMLDivElement> {
  trackRef: TrackReferenceOrPlaceholder;
  show?: "always" | "muted" | "unmuted";
}

function getSourceIcon(source: Track.Source, enabled: boolean) {
  switch (source) {
    case Track.Source.Microphone:
      return enabled ? (
        <Mic className="h-4 w-4" />
      ) : (
        <MicOff className="h-4 w-4" />
      );
    case Track.Source.Camera:
      return enabled ? (
        <Video className="h-4 w-4" />
      ) : (
        <VideoOff className="h-4 w-4" />
      );
    case Track.Source.ScreenShare:
      return enabled ? (
        <ScreenShare className="h-4 w-4" />
      ) : (
        <ScreenShareOff className="h-4 w-4" />
      );
    default:
      return undefined;
  }
}

/**
 * The `TrackMutedIndicator` shows whether the participant's camera or microphone is muted or not.
 * By default, a muted/unmuted icon is displayed for a camera, microphone, and screen sharing track.
 *
 * @example
 * ```tsx
 * <TrackMutedIndicator trackRef={trackRef} />
 * ```
 * @public
 */
export const TrackMutedIndicator = /* @__PURE__ */ React.forwardRef<
  HTMLDivElement,
  TrackMutedIndicatorProps
>(function TrackMutedIndicator(
  { trackRef, show = "always", ...props }: TrackMutedIndicatorProps,
  ref,
) {
  const { className, isMuted } = useTrackMutedIndicator(trackRef);

  const showIndicator =
    show === "always" ||
    (show === "muted" && isMuted) ||
    (show === "unmuted" && !isMuted);

  const htmlProps = React.useMemo(
    () =>
      mergeProps(props, {
        className,
      }),
    [className, props],
  );

  if (!showIndicator) {
    return null;
  }

  return (
    <div ref={ref} {...htmlProps} data-lk-muted={isMuted}>
      {props.children ?? getSourceIcon(trackRef.source, !isMuted)}
    </div>
  );
});

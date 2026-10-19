import * as React from "react";
import type { TrackReferenceOrPlaceholder } from "@livekit/components-core";
import type { ParticipantClickEvent } from "@livekit/components-core";
import { ParticipantTile } from "./participant-tile";
import { mergeProps } from "./merge-props";

import { cn } from "@/lib/utils/index";

import { isCarouselOpenAtom } from "../state/atoms";
import { useAtomValue } from "jotai";

/** @public */
export interface FocusLayoutContainerProps extends React.HTMLAttributes<HTMLDivElement> {}

/**
 * The `FocusLayoutContainer` is a layout component that expects two children:
 * A small side component: In a video conference, this is usually a carousel of participants
 * who are not in focus. And a larger main component to display the focused participant.
 * For example, with the `FocusLayout` component.
 *  @public
 */
export function FocusLayoutContainer(props: FocusLayoutContainerProps) {
  const elementProps = mergeProps(props, { className: "lk-focus-layout" });

  return <div {...elementProps}>{props.children}</div>;
}

/** @public */
export interface FocusLayoutProps extends React.HTMLAttributes<HTMLElement> {
  /** The track to display in the focus layout. */
  trackRef?: TrackReferenceOrPlaceholder;

  onParticipantClick?: (evt: ParticipantClickEvent) => void;
}

/**
 * The `FocusLayout` component is just a light wrapper around the `ParticipantTile` to display a single participant.
 * @public
//  */
//     top: 50%;
//     left: 0.5rem;
//     z-index: 50;
//     transform: translateY(-50%);
export function FocusLayout({ trackRef, ...htmlProps }: FocusLayoutProps) {
  const isCarouselOpen = useAtomValue(isCarouselOpenAtom);

  return (
    <ParticipantTile
      trackRef={trackRef}
      {...htmlProps}
      className={cn(htmlProps.className, isCarouselOpen && "w-full")}
    />
  );
}

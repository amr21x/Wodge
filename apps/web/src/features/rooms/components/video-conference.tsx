import type {
  MessageDecoder,
  MessageEncoder,
  TrackReferenceOrPlaceholder,
  WidgetState,
} from "@livekit/components-core";
import {
  isEqualTrackRef,
  isTrackReference,
  isWeb,
  log,
} from "@livekit/components-core";
import {
  CarouselLayout,
  ConnectionStateToast,
  FocusLayoutContainer,
  GridLayout,
  LayoutContextProvider,
  MessageFormatter,
  RoomAudioRenderer,
  useCreateLayoutContext,
  usePinnedTracks,
  useTracks,
} from "@livekit/components-react";
import { RoomEvent, Track } from "livekit-client";
import * as React from "react";
import { ParticipantTile } from "./participant-tile";
import { FocusLayout } from "./focus-layout";
import { cn } from "@/lib/utils/index";
import { useAtom } from "jotai";
import { isCarouselOpenAtom } from "../state/atoms";

export interface VideoConferenceProps extends React.HTMLAttributes<HTMLDivElement> {
  chatMessageFormatter?: MessageFormatter;
  chatMessageEncoder?: MessageEncoder;
  chatMessageDecoder?: MessageDecoder;
  /** @alpha */
  SettingsComponent?: React.ComponentType;
}

export function VideoConference({
  className,
  chatMessageFormatter: _chatMessageFormatter,
  chatMessageDecoder: _chatMessageDecoder,
  chatMessageEncoder: _chatMessageEncoder,
  SettingsComponent: _SettingsComponent,
  ...props
}: VideoConferenceProps) {
  const [, setWidgetState] = React.useState<WidgetState>({
    showChat: false,
    unreadMessages: 0,
    showSettings: false,
  });
  const lastAutoFocusedScreenShareTrack =
    React.useRef<TrackReferenceOrPlaceholder | null>(null);

  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { updateOnlyOn: [RoomEvent.ActiveSpeakersChanged], onlySubscribed: false },
  );

  const widgetUpdate = (state: WidgetState) => {
    log.debug("updating widget state", state);
    setWidgetState(state);
  };

  const layoutContext = useCreateLayoutContext();

  const screenShareTracks = tracks
    .filter(isTrackReference)
    .filter((track) => track.publication.source === Track.Source.ScreenShare);

  const focusTrack = usePinnedTracks(layoutContext)?.[0];
  const carouselTracks = tracks.filter(
    (track) => !isEqualTrackRef(track, focusTrack),
  );

  const [isCarouselOpen, setIsCarouselOpen] = useAtom(isCarouselOpenAtom);

  /* oxlint-disable react-hooks/exhaustive-deps -- LiveKit publications mutate in place; subscription keys and pinned track IDs control synchronization. */
  React.useEffect(() => {
    if (!focusTrack) {
      setIsCarouselOpen(false);
    }

    if (
      screenShareTracks.some((track) => track.publication.isSubscribed) &&
      lastAutoFocusedScreenShareTrack.current === null
    ) {
      log.debug("Auto set screen share focus:", {
        newScreenShareTrack: screenShareTracks[0],
      });

      if (screenShareTracks[0] === undefined) {
        return;
      }

      layoutContext.pin.dispatch?.({
        msg: "set_pin",
        trackReference: screenShareTracks[0]!,
      });
      lastAutoFocusedScreenShareTrack.current = screenShareTracks[0];
    } else if (
      lastAutoFocusedScreenShareTrack.current &&
      !screenShareTracks.some(
        (track) =>
          track.publication.trackSid ===
          lastAutoFocusedScreenShareTrack.current?.publication?.trackSid,
      )
    ) {
      log.debug("Auto clearing screen share focus.");
      layoutContext.pin.dispatch?.({ msg: "clear_pin" });
      lastAutoFocusedScreenShareTrack.current = null;
    }
  }, [
    screenShareTracks
      .map(
        (ref) => `${ref.publication.trackSid}_${ref.publication.isSubscribed}`,
      )
      .join(),
    focusTrack?.publication?.trackSid,
  ]);
  /* oxlint-enable react-hooks/exhaustive-deps */

  // useWarnAboutMissingStyles();

  return (
    <div
      className={cn("relative flex h-full items-stretch", className)}
      {...props}
    >
      {isWeb() && (
        <LayoutContextProvider
          value={layoutContext}
          // onPinChange={handleFocusStateChange}
          onWidgetChange={widgetUpdate}
        >
          <div className="flex w-full flex-col items-stretch">
            {!focusTrack ? (
              <div className="flex h-full flex-col items-center">
                <GridLayout tracks={tracks}>
                  <ParticipantTile />
                </GridLayout>
              </div>
            ) : (
              <div className="relative flex h-full w-full items-stretch justify-center">
                <FocusLayoutContainer
                  className={cn(
                    "lk-focus-layout transition-all",
                    !isCarouselOpen && "carousel-closed grid-cols-1",
                  )}
                >
                  <CarouselLayout
                    className={cn(
                      "lk-carousel transition-all",
                      !isCarouselOpen && "w-0",
                    )}
                    orientation="vertical"
                    tracks={carouselTracks}
                  >
                    <ParticipantTile />
                  </CarouselLayout>
                  {focusTrack && <FocusLayout trackRef={focusTrack} />}
                </FocusLayoutContainer>
              </div>
            )}
          </div>
        </LayoutContextProvider>
      )}
      <RoomAudioRenderer />
      <ConnectionStateToast />
    </div>
  );
}

import {
  Camera,
  MonitorOff,
  MonitorUp,
  PhoneCall,
  PhoneOff,
  Rss,
  ScreenShare,
  ScreenShareOff,
  Video,
  VideoOff,
} from "lucide-react";
import { SidebarItemBtn } from "./sidebar-item-btn";
import { Toggle } from "@/components/ui/toggle";
import { Button } from "@/components/ui/button";
import { useAtom, useAtomValue } from "jotai";
import {
  isCallWindowOpenAtom,
  isSidebarOpenAtom,
} from "@/client/state/global-atoms";
import { cn } from "@/lib/utils/index";
import {
  callQualityAtom,
  camDeviceAtom,
  camStatusAtom,
  roomAtom,
  screenStatusAtom,
} from "../../rooms/state/atoms";
import { useCallback, useDeferredValue } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Track } from "livekit-client";
import { toast } from "sonner";

export function CallCard() {
  const [isCallWindowOpen, setCallWindow] = useAtom(isCallWindowOpenAtom);
  const isSidebarOpen = useAtomValue(isSidebarOpenAtom);

  const room = useAtomValue(roomAtom);
  const [camStatus, setCamStatus] = useAtom(camStatusAtom);
  const [screenStatus, setScreenStatus] = useAtom(screenStatusAtom);

  const camDevice = useAtomValue(camDeviceAtom);
  const quality = useAtomValue(callQualityAtom);

  const onChangeCam = useCallback(
    (c: boolean) => {
      setCamStatus(c);
      room?.room.localParticipant.setCameraEnabled(c, {
        deviceId: camDevice,
      });
    },
    [room],
  );

  const deferredScreenStatus = useDeferredValue(screenStatus);

  const onChangeScreen = useCallback(
    async (c: boolean) => {
      try {
        await room?.room.localParticipant.setScreenShareEnabled(c, {
          selfBrowserSurface: "include",
          audio: true,
        });
        setScreenStatus(c);
      } catch (e) {
        toast.error("Failed to share screen");
        setScreenStatus(false);
      }
    },
    [room],
  );

  return (
    <div
      className={cn(
        "flex w-60 flex-col overflow-hidden border-r border-t border-border/50 bg-background px-2 py-2.5 transition-all",
        !isSidebarOpen && "w-0 px-0",
      )}
    >
      <div
        className={cn(
          "flex items-center gap-1 pl-0.5 text-foreground",
          quality === "excellent" && "text-green-500 dark:text-green-600",
          quality === "good" && "text-yellow-500 dark:text-yellow-600",
          quality === "poor" && "text-destructive",
        )}
      >
        <Rss className="size-4" />
        <p className="">Connected</p>
      </div>

      <Button
        size="fit"
        variant="link"
        className="mb-2 w-full justify-start truncate rounded-none p-0 px-0.5 text-muted-foreground hover:text-foreground"
        onClick={() => {
          setCallWindow((c) => !c);
        }}
      >
        <span className="truncate">
          {isCallWindowOpen
            ? "Close call window"
            : `${room?.workspaceName} / ${room?.teamName} / ${room?.channelName}`}
        </span>
      </Button>
      <div className="flex gap-1">
        <Toggle
          variant="outline"
          className="group basis-1/3"
          pressed={camStatus}
          onPressedChange={onChangeCam}
        >
          {camStatus ? (
            <Video className="size-5 group-data-[state=on]:text-green-600 dark:group-data-[state=on]:text-green-500" />
          ) : (
            <VideoOff className="size-5" />
          )}
        </Toggle>

        {!deferredScreenStatus ? (
          <>
            <Toggle
              variant="outline"
              className="group basis-1/3"
              pressed={screenStatus}
              onPressedChange={onChangeScreen}
            >
              <ScreenShare className="size-5" />
            </Toggle>
          </>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Toggle
                pressed={true}
                variant="outline"
                className="group basis-1/3"
              >
                <ScreenShareOff className="size-5 text-green-600 dark:text-green-500" />
              </Toggle>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top">
              <DropdownMenuItem
                onClick={async () => {
                  try {
                    const track =
                      await room?.room.localParticipant.createScreenTracks({
                        selfBrowserSurface: "include",
                        audio: true,
                      });

                    if (track && track[0]) {
                      const cur =
                        room?.room.localParticipant.getTrackPublication(
                          Track.Source.ScreenShare,
                        );

                      if (cur && cur.track) {
                        await Promise.all([
                          room?.room.localParticipant.publishTrack(track[0]),
                          room?.room.localParticipant.unpublishTrack(cur.track),
                        ]);
                      } else {
                        await room?.room.localParticipant.publishTrack(
                          track[0],
                        );
                      }
                    }
                  } catch (e) {
                    toast.warning("Changing shared screen cancelled");
                  }
                }}
              >
                <ScreenShare className="size-4" />
                Change screen
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onChangeScreen.bind(null, false)}>
                <ScreenShareOff className="size-4" />
                Stop sharing
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <SidebarItemBtn
          Icon={PhoneOff}
          className="group/close basis-1/3"
          iconClassName="size-5 group-hover/close:text-red-600 dark:group-hover/close:text-red-500 text-accent-foreground"
          variant="outline"
          onClick={async () => {
            await room?.room.disconnect();
          }}
        />
      </div>
    </div>
  );
}

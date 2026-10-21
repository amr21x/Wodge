"use client";

import { useCanView } from "@/features/workspace/hooks/use-can-view";
import { RoomHeader } from "@/features/rooms/components/room-header";
import { useCurrentRoomRep } from "@/features/rooms/hooks/use-room-rep";
import { useUpdateRecentlyVisited } from "@/features/workspace/hooks/use-recently-visited";
import { MessageList } from "../../../../../../../features/rooms/components/message-list";
import { MessageEditor } from "../../../../../../../features/rooms/components/message-editor";

function ChannelPage() {
  useUpdateRecentlyVisited("room");

  const rep = useCurrentRoomRep();
  const canView = useCanView({ type: "room" });

  return (
    <>
      {!canView && (
        <output className="p-4">
          Room access is being checked or is unavailable. Pending local edits
          have been kept.
        </output>
      )}
      <div
        className={canView ? "flex h-full w-full flex-col" : "hidden"}
        aria-hidden={!canView}
      >
        <div className="flex-1" />

        <div className="overflow-y-auto overflow-x-hidden pt-3">
          <div className="space-y-2 px-2 pb-3">
            <RoomHeader />
            <MessageList rep={rep} />
          </div>
        </div>
        <MessageEditor rep={rep} />
      </div>
    </>
  );
}

export default ChannelPage;

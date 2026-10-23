import { getSrcLink } from "@/features/files/download";
import { DrObj } from "@wodge/domain/types";
import { Message } from "@wodge/domain/rooms/models";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";

export function VideoMessage({
  message,
  workspaceId,
}: {
  message: DrObj<Message>;
  workspaceId: string;
}) {
  const { channelId, teamId } = useParams<{
    channelId: string;
    teamId: string;
  }>();
  const { data } = useQuery({
    queryKey: ["video", message.id],
    queryFn: async () => {
      const link = await getSrcLink(message.id, workspaceId, channelId, teamId);

      if (!link) {
        throw new Error("Failed to get audio link");
      }

      const res = await fetch(link, {});

      const { downloadUrl } = await res.json<{
        downloadUrl: string;
      }>();

      return downloadUrl;
    },
    enabled: message.type !== "text",

    staleTime: 24 * 60 * 60 * 7,
  });

  return (
    <div className="rounded-md">
      {data && (
        /* oxlint-disable jsx-a11y/media-has-caption -- The current upload/demo contract supplies no caption track; do not advertise fabricated captions. */
        <video
          controls
          className="aspect-video max-h-[10.125rem] max-w-72 rounded-md"
        >
          <source src={data} type="video/webm" />
        </video>
        /* oxlint-enable jsx-a11y/media-has-caption */
      )}
    </div>
  );
}

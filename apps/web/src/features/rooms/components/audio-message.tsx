import { getSrcLink } from "@/features/files/download";
import { DrObj } from "@wodge/domain/types";
import { Message } from "@wodge/domain/rooms/models";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { toast } from "sonner";

export function AudioMessage({
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

  const { data, isPending, isFetching, isError } = useQuery({
    queryKey: ["audio", message.id],
    queryFn: async () => {
      const link = await getSrcLink(message.id, workspaceId, channelId, teamId);

      if (!link) {
        throw new Error("Failed to get audio link");
      }

      const res = await fetch(link, {});

      if (!res.ok) {
        throw new Error("Failed to fetch audio");
      }

      const { downloadUrl } = await res.json<{
        downloadUrl: string;
      }>();

      return downloadUrl;
    },
    enabled: message.type !== "text",

    staleTime: 24 * 60 * 60 * 7,
  });

  if (isError) {
    toast.error("Failed to fetch audio");
  }

  return (
    <>
      {data && (
        <div className="py-1">
          <audio controls>
            <source src={data} type="audio/webm" />
          </audio>
        </div>
      )}
    </>
  );
}

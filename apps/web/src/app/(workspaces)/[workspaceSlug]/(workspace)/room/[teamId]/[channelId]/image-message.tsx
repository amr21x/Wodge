import { getSrcLink } from "@/lib/utils";
import { DrObj, Message } from "@wodge/data";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";

export function ImageMessage({
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
  const { data, isPending, isFetching } = useQuery({
    queryKey: ["image", message.id],
    queryFn: async () => {
      const link = await getSrcLink(message.id, workspaceId, channelId, teamId);

      if (!link) throw new Error("Failed to get audio link");
      const res = await fetch(link, {
      });

      const { downloadUrl } = await res.json<{
        downloadUrl: string;
      }>();

      return downloadUrl;
    },
    enabled: message.type !== "text",

    staleTime: 24 * 60 * 60 * 7,
  });
  return (
    <div className="relative h-56 w-72 overflow-hidden rounded-md">
      {data && (
        <img
          src={data}
          alt={message.content}
          className="absolute inset-0 h-full w-full object-cover text-transparent"
          loading="lazy"
        />
      )}
    </div>
  );
}

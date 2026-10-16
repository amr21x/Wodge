import { env } from "@wodge/env";
import { toast } from "sonner";

export class API {
  public static uploadImage = async (
    file: File,
    workspaceId: string,
    teamId: string,
    channelId: string,
  ) => {
    const formData = new FormData();

    formData.append("file", file);

    const tokenRes = await fetch("/api/users/token", {
      headers: {
        "is-upload": "true",
      },
    });

    if (!tokenRes.ok) {
      toast.error("Failed to get token");
      return;
    }

    const { token } = await tokenRes.json<{ token: string }>();

    try {
      const res = await fetch(
        `${env.NEXT_PUBLIC_BACKEND_DOMAIN}/parties/workspace/${workspaceId}/file/${teamId}/${channelId}?token=${token}`,
        { method: "POST", body: formData },
      );

      if (!res.ok) {
        toast.error("Something went wrong");
        return;
      }

      const data = await res.json<{ fileId: string }>();

      const linkRes = await fetch(
        `${env.NEXT_PUBLIC_BACKEND_DOMAIN}/parties/workspace/${workspaceId}/file/${teamId}/${channelId}/${btoa(data.fileId)}?token=${token}`,
      );

      const link = await linkRes.json<{ downloadUrl: string }>();

      return link.downloadUrl;
    } catch {}
  };
}

export default API;

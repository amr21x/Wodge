import { env } from "@wodge/env/client";
import { toast } from "@/components/ui/toast";

export async function getSrcLink(
  id: string,
  wid: string,
  cid: string,
  tid: string,
) {
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

  return `${env.NEXT_PUBLIC_BACKEND_DOMAIN}/parties/workspace/${wid}/file/${tid}/${cid}/${btoa(id)}?token=${token}`;
}

export async function download(url: string, name?: string) {
  try {
    const res = await fetch(url);

    if (!res.ok) {
      throw new Error("Failed to download file");
    }

    const data = await res.json<{ downloadUrl?: string }>();

    if (!data || !data.downloadUrl) {
      throw new Error("Failed to download file");
    }

    if (data.downloadUrl) {
      const tempLink = document.createElement("a");

      tempLink.href = data.downloadUrl;

      if (name) {
        tempLink.setAttribute("download", name);
      } // This attribute triggers the download instead of navigation

      tempLink.style.display = "none"; // Hide the anchor element
      // Append the anchor element to the document body
      document.body.appendChild(tempLink);

      // Simulate a click on the anchor element
      tempLink.click();

      // Clean up - remove the anchor element from the document body
      document.body.removeChild(tempLink);
    }
  } catch (e) {
    console.log(e);
    toast.error("Failed to download file");
  }
}

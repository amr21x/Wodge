import { env } from "@wodge/env";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

export function useUpload(
  domain: "user" | "workspace",
  id?: string,
  onSuccess?: () => void,
) {
  const { mutate: upload, isPending: isUploading } = useMutation({
    mutationFn: async (data: FormData) => {
      if (!id) return false;

      const tokenRes = await fetch("/api/users/token");

      if (!tokenRes.ok) {
        throw new Error("Failed to get token");
      }

      const { token } = await tokenRes.json<{ token: string }>();

      const uploadRes = await fetch(
        `${env.NEXT_PUBLIC_BACKEND_DOMAIN}/parties/${domain}${domain === "user" ? "" : "s"}/${id}/avatar?token=${token}`,
        {
          method: "POST",
          body: data,
        },
      );

      if (!uploadRes.ok) {
        throw new Error("Failed to upload avatar");
      }

      const { key } = await uploadRes.json<{ key: string }>();

      const updateRes = await fetch(`/api/${domain}s/${id}/avatar`, {
        method: "POST",
        headers: {
          key,
        },
      });

      if (!updateRes.ok) throw new Error("Failed to update avatar");

      return true;
    },
    onSuccess: () => {
      toast.success("Avatar uploaded");
      if (onSuccess) onSuccess();
    },
    onError: () => {
      toast.error("Failed to upload avatar");
    },
  });
  return { upload, isUploading };
}

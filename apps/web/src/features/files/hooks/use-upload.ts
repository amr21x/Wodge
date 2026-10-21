import { failureMessage, requireOk } from "@/client/errors";
import { env } from "@wodge/env/client";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

export function useUpload(
  domain: "user" | "workspace",
  id?: string,
  onSuccess?: () => void,
) {
  const { mutate: upload, isPending: isUploading } = useMutation({
    mutationFn: async (data: FormData) => {
      if (!id) {
        throw new Error("No upload target selected");
      }

      const tokenRes = await fetch("/api/users/token", {
        headers: { "is-upload": "true" },
      });

      await requireOk(tokenRes);

      const { token } = await tokenRes.json<{ token: string }>();

      const uploadRes = await fetch(
        `${env.NEXT_PUBLIC_BACKEND_DOMAIN}/parties/${domain}/${id}/avatar?token=${token}`,
        {
          method: "POST",
          body: data,
        },
      );

      await requireOk(uploadRes);

      const { key } = await uploadRes.json<{ key: string }>();

      const updateRes = await fetch(`/api/${domain}s/${id}/avatar`, {
        method: "POST",
        headers: {
          key,
        },
      });

      await requireOk(updateRes);

      return true;
    },
    onSuccess: () => {
      toast.success("Avatar uploaded");

      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error) => {
      toast.error(
        failureMessage(error, "Avatar upload failed. Please try again."),
      );
    },
  });

  return { upload, isUploading };
}

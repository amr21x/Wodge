import { failureMessage, requireOk } from "@/client/errors";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

export function useDelete(
  domain: "user" | "workspace",
  id?: string,
  onSuccess?: () => void,
) {
  const { mutate: deleteAvatar, isPending: isDeleting } = useMutation({
    mutationFn: async () => {
      if (!id) {
        throw new Error("No avatar selected");
      }

      const res = await fetch(`/api/${domain}s/${id}/avatar`, {
        method: "DELETE",
      });

      await requireOk(res);

      return true;
    },
    onSuccess: () => {
      toast.success("Avatar deleted");

      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error) => {
      toast.error(failureMessage(error));
    },
  });

  return { deleteAvatar, isDeleting };
}

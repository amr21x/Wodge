"use client";

import { Button } from "@/components/ui/button";
import { env } from "@wodge/env";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";

export function AcceptButton({ slug }: { slug: string }) {
  const { token, workspaceSlug: workspaceId } = useParams<{
    token: string;
    workspaceSlug: string;
  }>();

  const queryClient = useQueryClient();
  const router = useRouter();

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/workspaces/${workspaceId}/join/${token}`, {
        method: "POST",
      });

      if (!res.ok) throw new Error("Failed to join workspace");
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["user-workspaces"],
      });

      router.push(`/${slug}`);
    },
    onError: (e) => {
      toast.error(e.message);
    },
  });

  return (
    <Button className="w-full" isPending={isPending} onClick={() => mutate()}>
      Accept Invitation
    </Button>
  );
}

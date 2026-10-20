import { useQuery } from "@tanstack/react-query";
import { api } from "@/client/api";
import { requireOk } from "@/client/errors";
import { useCurrentUser } from "@/features/account/hooks/use-current-user";

export function useUploadToken() {
  const { user } = useCurrentUser();
  return useQuery({
    queryKey: ["upload-token", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const response = await api.api.users.token.$get({
        header: { "is-upload": "true" },
      });
      await requireOk(response);
      return (await response.json()).token;
    },
    staleTime: 0,
    gcTime: 0,
  });
}

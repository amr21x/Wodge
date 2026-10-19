import { useQuery } from "@tanstack/react-query";

import { getAvatarAddress } from "@/client/sync/transport";

export function useAvatarUrl(id?: string) {
  const { data, isError } = useQuery({
    queryKey: ["avatar", id],
    queryFn: async () => {
      const res = await fetch(getAvatarAddress(id));

      console.log(res);

      if (res.ok) {
        return getAvatarAddress(id);
      }

      return null;
    },
    enabled: !!id,
  });

  if (isError) {
    console.error("Failed to fetch avatar");
  }

  return data;
}

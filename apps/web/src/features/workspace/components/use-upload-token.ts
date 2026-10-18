import { useQuery } from "@tanstack/react-query";

export function useUploadToken() {
  const { data: token } = useQuery({
    queryKey: ["upload-token"],
    queryFn: async () => {
      const res = await fetch(`/api/users/token`, {
        headers: {
          "is-upload": "true",
        },
      });

      if (!res.ok) {
        return "";
      }

      const data = await res.json<{ token: string }>();

      return data.token;
    },
    staleTime: 0,
  });

  return token;
}

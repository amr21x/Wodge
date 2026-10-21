import { queryClient } from "./query";

export function refreshPermissions({
  refetch = true,
  revoke = false,
}: { refetch?: boolean; revoke?: boolean } = {}) {
  // Explicit denials revoke immediately; ordinary reconnects retain pending local work.
  if (revoke) queryClient.setQueriesData({ queryKey: ["permission"] }, false);
  void queryClient.invalidateQueries({
    queryKey: ["permission"],
    refetchType: refetch ? "active" : "none",
  });
  void queryClient.invalidateQueries({
    queryKey: ["authorization"],
    refetchType: refetch ? "active" : "none",
  });
}

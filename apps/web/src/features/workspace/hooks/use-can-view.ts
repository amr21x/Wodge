import {
  useChannelPermission,
  type ChannelPermissionInput,
} from "./use-channel-permission";
export function useCanView(input: ChannelPermissionInput) {
  return useChannelPermission(input, "read");
}

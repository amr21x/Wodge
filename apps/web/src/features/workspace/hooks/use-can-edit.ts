import {
  useChannelPermission,
  type ChannelPermissionInput,
} from "./use-channel-permission";
export function useCanEdit(input: ChannelPermissionInput) {
  return useChannelPermission(input, "update");
}

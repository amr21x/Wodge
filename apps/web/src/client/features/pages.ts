import { CHANNEL_FEATURES, type Feature } from "@wodge/domain/features/models";
export function pageFeatures(path: string): Feature[] {
  const parts = path.split("/").filter(Boolean);
  if (parts[0] === "new") return ["workspaceCreation"];
  if (parts[1] === "join") return ["membership"];
  if (parts[0] === "settings") return []; // account/recovery shell
  const channel = CHANNEL_FEATURES[parts[1] as keyof typeof CHANNEL_FEATURES];
  if (channel) return [channel];
  if (parts[1] === "settings") {
    switch (parts[2]) {
      case "account":
        return ["profiles"];
      case "members":
        return ["membership"];
      case "teams":
        return ["teamManagement"];
      case "upgrade":
        return ["billing"];
      default:
        return ["workspaceSettings"];
    }
  }
  return [];
}

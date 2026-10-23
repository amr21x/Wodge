import { CHANNEL_FEATURES } from "@wodge/domain/features/models";
import type { Feature } from "@wodge/domain/features/models";
/** undefined means unregistered: new endpoints must make an explicit choice. */
export function httpFeatures(
  path: string,
  method: string,
): Feature[] | undefined {
  if (
    [
      "/api/feature-flags",
      "/api/users/token",
      "/api/users/me",
      "/api/users/workspaces",
      "/api/users/update",
      "/api/replicache/pull",
      "/api/replicache/push",
    ].includes(path)
  )
    return [];
  if (/^\/api\/users\/(?:[^/]+\/)?avatar$/.test(path)) return ["profiles"];
  if (/^\/api\/rooms\/[^/]+\/token$/.test(path)) return [];
  if (/^\/api\/mcp(?:\/|$)/.test(path)) return ["agentAccess"];
  if (path === "/api/workspaces/new") return ["workspaceCreation"];
  if (path.startsWith("/api/workspaces/preview/")) return ["membership"];
  const match = path.match(/^\/api\/workspaces\/[^/]+(.*)$/);
  if (!match) return undefined;
  const tail = match[1];
  if (tail?.startsWith("/authorization")) return ["membership"];
  if (/^\/ai(?:\/|$)/.test(tail!)) return ["hostedGeneration"];
  if (/^\/billing\/(checkout|portal)$/.test(tail!)) return ["billing"];
  if (
    /^\/(invite|join\/[^/]+|leave|members(?:\/[^/]+(?:\/role)?)?)$/.test(tail!)
  )
    return ["membership"];
  if (tail!.startsWith("/files/")) return ["resources"];
  // This legacy route accesses the standalone team bucket, not page attachments.
  if (tail!.startsWith("/file/")) return ["resources"];
  if (tail === "/update" || tail === "/avatar") return ["workspaceSettings"];
  if (tail === "" || tail === "/")
    return method === "GET" ? [] : ["workspaceSettings"];
  return undefined;
}

const WORKSPACE_MUTATIONS: Record<string, Feature[]> = {
  removeMember: ["membership"],
  changeMemberRole: ["membership"],
  createTeam: ["teamManagement"],
  updateTeam: ["teamManagement"],
  deleteTeam: ["teamManagement"],
  createPage: ["pages"],
  updatePage: ["pages"],
  updateFolder: ["pages"],
  deleteFolder: ["pages"],
  createRoom: ["messaging"],
  updateRoom: ["messaging"],
  createThread: ["discussions"],
  updateThread: ["discussions"],
};
const DOMAIN_MUTATIONS: Record<string, readonly string[]> = {
  room: ["sendMessage", "deleteMessage", "editMessage", "vote", "removeVote"],
  thread: [
    "createPost",
    "editPost",
    "deletePost",
    "togglePost",
    "createComment",
    "editComment",
    "deleteComment",
    "vote",
    "removeVote",
  ],
  page: [
    "createColumn",
    "deleteColumn",
    "updateColumn",
    "createTask",
    "editTask",
    "deleteTask",
    "moveColumns",
    "moveTasks",
  ],
};

export function mutationFeatures(
  domain: string,
  name: string,
  args: unknown,
): Feature[] | undefined {
  const input =
    args && typeof args === "object" ? (args as Record<string, unknown>) : {};
  if (domain === "workspace") {
    if (name === "deleteChannel") {
      const feature =
        CHANNEL_FEATURES[input.type as keyof typeof CHANNEL_FEATURES];
      return feature ? [feature] : undefined;
    }
    if (
      name === "updateTeam" &&
      input.teamUpdate &&
      typeof input.teamUpdate === "object" &&
      "action" in input.teamUpdate &&
      ["addFolder", "removeFolders"].includes(String(input.teamUpdate.action))
    )
      return ["pages"];
    return Object.hasOwn(WORKSPACE_MUTATIONS, name)
      ? [...WORKSPACE_MUTATIONS[name]!]
      : undefined;
  }
  if (!DOMAIN_MUTATIONS[domain]?.includes(name)) return undefined;
  const required: Feature[] =
    domain === "page"
      ? ["pages", "tasks"]
      : domain === "room"
        ? ["messaging"]
        : ["discussions"];
  if (["vote", "removeVote"].includes(name) || input.type === "poll")
    required.push("polls");
  if (["image", "audio", "video", "file"].includes(String(input.type)))
    required.push("attachments");
  return required;
}

export function partyFeatures(
  domain: string,
  path: string,
  method: string,
): Feature[] | undefined {
  if (domain === "page")
    return path.startsWith("/prompt")
      ? ["hostedGeneration"]
      : path.startsWith("/replicache-")
        ? ["pages", "tasks"]
        : ["pages"];
  if (domain === "thread") return ["discussions"];
  if (path.startsWith("/service/")) return [];
  if (domain === "workspace" && path.startsWith("/authorization"))
    return ["membership"];
  if (domain === "room")
    return path === "/token" ? ["messaging", "calls"] : ["messaging"];
  if (domain === "user") {
    if (path === "/avatar") return ["profiles"];
    if (path === "/update") return []; // profile change notification, not a profile write
    if (path.startsWith("/replicache-") || path.startsWith("/service/"))
      return [];
    return undefined;
  }
  if (domain === "workspace") {
    if (path.startsWith("/replicache-") || path.startsWith("/service/"))
      return [];
    if (path === "/create") return ["workspaceCreation"];
    if (["/join", "/leave"].includes(path)) return ["membership"];
    if (["/update", "/avatar", "/"].includes(path))
      return ["workspaceSettings"];
    if (path.startsWith("/files/")) return ["resources"];
    if (path.startsWith("/file/")) {
      // Channel file routes have team/channel/path; legacy team files have team/path.
      return method === "POST" || path.split("/").filter(Boolean).length >= 4
        ? ["attachments"]
        : ["resources"];
    }
  }
  return undefined;
}

/** Mutations identify existing records through the operation's established DTO shape. */
export function mutationRecordId(args: unknown): unknown {
  if (!args || typeof args !== "object") return;
  const input = args as Record<string, unknown>;
  const message = input.message;
  return (
    input.id ??
    input.msgId ??
    input.postId ??
    (message && typeof message === "object" && "id" in message
      ? message.id
      : undefined)
  );
}

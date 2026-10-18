/**
 * Default symbol to join multiple keys
 */
export const JOINER = "/";

/** User */
export const USER_KEY = "user";

export const USER_IS_CONNECTED_KEY = "isConnected";

export const USER_WORKSPACES_STORE_KEY = "workspaces";

export const makeWorkspacesStoreKey = () =>
  USER_KEY + JOINER + USER_WORKSPACES_STORE_KEY;

/** Workspace */
export const WORKSPACE_PREFIX = "workspace";

export const WORKSPACE_STRUCTURE_KEY = "structure";

export const WORKSPACE_ROLES_KEY = "roles";

export const WORKSPACE_MEMBERS_KEY = "members";

export const WORKSPACE_INVITES_KEY = "invite";

export const WORKSPACE_PRESENCE_KEY = "presence";

export const makeWorkspaceKey = () => WORKSPACE_PREFIX;

export const makeWorkspaceStructureKey = () =>
  WORKSPACE_PREFIX + JOINER + WORKSPACE_STRUCTURE_KEY;

export const makeWorkspaceRolesKey = () =>
  WORKSPACE_PREFIX + JOINER + WORKSPACE_ROLES_KEY;

export const makeWorkspaceMembersKey = () =>
  WORKSPACE_PREFIX + JOINER + WORKSPACE_MEMBERS_KEY;

/** Replicache */
export const REPLICACHE_CLIENT_GROUP_PREFIX = "clientGroup/";

export const REPLICACHE_CLIENT_PREFIX = "client/";

export const REPLICACHE_VERSIONS_KEY = "versions";

export const makeClientKey = (clientId: string, clientGroupId: string) =>
  clientGroupId + JOINER + REPLICACHE_CLIENT_PREFIX + clientId;

export const makeClientGroupKey = (clientGroupId: string) =>
  REPLICACHE_CLIENT_GROUP_PREFIX + clientGroupId;

export const extractClientId = (clientKey: string) => clientKey.split("/")[3];

export type PokeMessage = {
  type:
    | "user"
    | "workspace"
    | "channel"
    | "presence"
    | "welcome"
    | "deleteWorkspace"
    | "workspaceInfo"
    | "invite"
    | "team-files"
    | "workspaceMembers";
  id?: string;
  teamId?: string;
};

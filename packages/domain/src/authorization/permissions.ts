export const permissionCatalogue = {
  workspace: ["read", "manage"],
  team: ["read", "manageMembers"],
  role: ["read", "create", "update", "delete", "assign"],
  room: ["read"],
  message: ["read", "send", "editOwn", "deleteOwn", "moderate", "vote"],
  page: ["read", "update"],
  thread: ["read", "update"],
} as const;

export type PermissionResource = keyof typeof permissionCatalogue;

export type Permissions = {
  [Resource in PermissionResource]?: (typeof permissionCatalogue)[Resource][number][];
};

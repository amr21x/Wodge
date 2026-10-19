import {
  permissionCatalogue,
  type Permissions,
} from "@wodge/domain/authorization/permissions";
export function allPermissions(): Permissions {
  return Object.fromEntries(
    Object.entries(permissionCatalogue).map(([resource, actions]) => [
      resource,
      [...actions],
    ]),
  ) as Permissions;
}

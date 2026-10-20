import {
  CreateRoleSchema,
  AssignRoleSchema,
  PermissionRequestSchema,
} from "@wodge/domain/authorization/validation";
import { jsonBody } from "../validators/json";
import { Hono } from "hono";
import { inject, injectable } from "tsyringe";
import { AssignmentHandlers } from "../handlers/authorization/assignments";
import { PermissionHandlers } from "../handlers/authorization/permissions";
import { RoleHandlers } from "../handlers/authorization/roles";
import type { WorkspaceContext } from "../types/hono-context";
@injectable()
export class AuthorizationRoutes {
  readonly router: ReturnType<typeof AuthorizationRoutes.define>;

  constructor(
    @inject(RoleHandlers) roleHandlers: RoleHandlers,
    @inject(AssignmentHandlers) assignmentHandlers: AssignmentHandlers,
    @inject(PermissionHandlers) permissionHandlers: PermissionHandlers,
  ) {
    this.router = AuthorizationRoutes.define(
      roleHandlers,
      assignmentHandlers,
      permissionHandlers,
    );
  }
  private static define(
    roleHandlers: RoleHandlers,
    assignmentHandlers: AssignmentHandlers,
    permissionHandlers: PermissionHandlers,
  ) {
    const router = new Hono<WorkspaceContext>();

    const withListRoles = router.get("/roles", roleHandlers.listRoles);
    const withCreateRole = withListRoles.post(
      "/roles",
      jsonBody(CreateRoleSchema),
      roleHandlers.createRole,
    );
    const withUpdateRole = withCreateRole.patch(
      "/roles/:roleId",
      jsonBody(CreateRoleSchema),
      roleHandlers.updateRole,
    );
    const withDeleteRole = withUpdateRole.delete(
      "/roles/:roleId",
      roleHandlers.deleteRole,
    );
    const withAssignRole = withDeleteRole.post(
      "/assignments",
      jsonBody(AssignRoleSchema),
      assignmentHandlers.assignRole,
    );
    const withRemoveRole = withAssignRole.delete(
      "/assignments/:assignmentId",
      assignmentHandlers.removeRole,
    );
    const withHasPermission = withRemoveRole.post(
      "/check",
      jsonBody(PermissionRequestSchema),
      permissionHandlers.hasPermission,
    );

    return withHasPermission.get(
      "/pages/:pageId/members",
      permissionHandlers.pageMembers,
    );
  }
}

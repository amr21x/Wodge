import type { JsonContext } from "../../validators/json";
import { WorkspaceAuthorization } from "@wodge/auth/authorization/service";
import { CreateRoleSchema } from "@wodge/domain/authorization/validation";
import type { Context } from "hono";
import { inject, injectable } from "tsyringe";
import { AuthorizationInvalidations } from "../../lib/authorization/invalidation";
import { requestIdentity } from "../../lib/helpers/identity";
import type { WorkspaceContext } from "../../types/hono-context";
import { RoleParams } from "../../validators/authorization";

@injectable()
export class RoleHandlers {
  constructor(
    @inject(WorkspaceAuthorization)
    private readonly authorization: WorkspaceAuthorization,
    @inject(AuthorizationInvalidations)
    private readonly authorizationInvalidations: AuthorizationInvalidations,
  ) {}

  listRoles = async (c: Context<WorkspaceContext>) => {
    return c.json(await this.authorization.listRoles(requestIdentity(c)), 200);
  };

  createRole = async (
    c: JsonContext<WorkspaceContext, typeof CreateRoleSchema>,
  ) => {
    const input = c.req.valid("json");
    const role = await this.authorization.createRole(input, requestIdentity(c));
    await this.authorizationInvalidations.flush();
    return c.json(role, 201);
  };

  updateRole = async (
    c: JsonContext<WorkspaceContext, typeof CreateRoleSchema>,
  ) => {
    const { roleId } = RoleParams.parse(c.req.param());
    const input = c.req.valid("json");
    const role = await this.authorization.updateRole(
      { roleId, ...input },
      requestIdentity(c),
    );
    await this.authorizationInvalidations.flush();
    return c.json(role, 200);
  };

  deleteRole = async (c: Context<WorkspaceContext>) => {
    await this.authorization.deleteRole(
      RoleParams.parse(c.req.param()),
      requestIdentity(c),
    );
    await this.authorizationInvalidations.flush();
    return c.body(null, 204);
  };
}

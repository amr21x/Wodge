import type { JsonContext } from "../../validators/json";
import { WorkspaceAuthorization } from "@wodge/auth/authorization/service";
import { AssignRoleSchema } from "@wodge/domain/authorization/validation";
import type { Context } from "hono";
import { inject, injectable } from "tsyringe";
import { AuthorizationInvalidations } from "../../lib/authorization/invalidation";
import { requestIdentity } from "../../lib/helpers/identity";
import type { WorkspaceContext } from "../../types/hono-context";
import { AssignmentParams } from "../../validators/authorization";

@injectable()
export class AssignmentHandlers {
  constructor(
    @inject(WorkspaceAuthorization)
    private readonly authorization: WorkspaceAuthorization,
    @inject(AuthorizationInvalidations)
    private readonly authorizationInvalidations: AuthorizationInvalidations,
  ) {}

  assignRole = async (
    c: JsonContext<WorkspaceContext, typeof AssignRoleSchema>,
  ) => {
    const assignment = await this.authorization.assignRole(
      c.req.valid("json"),
      requestIdentity(c),
    );
    await this.authorizationInvalidations.flush();
    return c.json(assignment, 201);
  };

  removeRole = async (c: Context<WorkspaceContext>) => {
    await this.authorization.removeRole(
      AssignmentParams.parse(c.req.param()),
      requestIdentity(c),
    );
    await this.authorizationInvalidations.flush();
    return c.body(null, 204);
  };
}

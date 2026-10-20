import { z } from "zod";
import type { JsonContext } from "../../validators/json";
import { WorkspaceAuthorization } from "@wodge/auth/authorization/service";

import {
  PermissionRequestSchema,
  RoomAuthorizationScopeSchema,
} from "@wodge/domain/authorization/validation";
import type { Context } from "hono";
import { inject, injectable } from "tsyringe";
import { AuthorizationInvalidations } from "../../lib/authorization/invalidation";
import { requestIdentity } from "../../lib/helpers/identity";
import { readJson } from "../../lib/helpers/json";
import type { WorkspaceContext } from "../../types/hono-context";

const pageParams = z.object({ pageId: z.string().min(1) });

@injectable()
export class PermissionHandlers {
  constructor(
    @inject(WorkspaceAuthorization)
    private readonly authorization: WorkspaceAuthorization,
    @inject(AuthorizationInvalidations)
    private readonly authorizationInvalidations: AuthorizationInvalidations,
  ) {}

  hasPermission = async (
    c: JsonContext<WorkspaceContext, typeof PermissionRequestSchema>,
  ) => {
    return c.json(
      await this.authorization.hasPermission(
        c.req.valid("json"),
        requestIdentity(c),
      ),
      200,
    );
  };

  pageMembers = async (c: Context<WorkspaceContext>) => {
    const { pageId } = pageParams.parse(c.req.param());
    return c.json(
      await this.authorization.pageMembers(pageId, requestIdentity(c)),
      200,
    );
  };

  roomGrant = async (c: Context<WorkspaceContext>) => {
    const input = RoomAuthorizationScopeSchema.parse(await readJson(c.req));
    const grant = await this.authorization.resolveRoomGrant(
      input,
      requestIdentity(c),
    );
    await this.authorizationInvalidations.flush();
    return c.json(grant, 200);
  };
}

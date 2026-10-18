import { ResourceGrantCache } from "@wodge/auth/authorization/grants";
import { RoomAuthorizationScopeSchema } from "@wodge/domain/authorization/validation";
import type { Context } from "hono";
import { inject, injectable } from "tsyringe";
import { readJson } from "../../lib/helpers/json";
import type { RoomContext } from "../../types/hono-context";
import { InvalidationBody } from "../../validators/authorization";

@injectable()
export class RoomScopeHandlers {
  constructor(
    @inject(ResourceGrantCache) private readonly grants: ResourceGrantCache,
  ) {}
  bindRoomScope = async (c: Context<RoomContext>) => {
    await this.grants.bind(
      RoomAuthorizationScopeSchema.parse(await readJson(c.req)),
    );
    return c.body(null, 204);
  };

  invalidateRoom = async (c: Context<RoomContext>) => {
    const input = InvalidationBody.parse(await readJson(c.req));
    await this.grants.invalidate(input.workspaceId, input.revision);
    return c.body(null, 204);
  };
}

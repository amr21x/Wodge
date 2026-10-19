import { ResourceGrantCache } from "@wodge/auth/authorization/grants";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { inject, injectable } from "tsyringe";
import { handleError } from "../errors/handler";
import { RoomScopeHandlers } from "../handlers/authorization/room-scope";
import { RoomsHandlers } from "../handlers/rooms/handlers";
import { roomAuthorization } from "../middleware/room-authorization";
import type { RoomContext } from "../types/hono-context";
@injectable()
export class RoomRoutes {
  readonly router: ReturnType<typeof RoomRoutes.define>;

  constructor(
    @inject(RoomsHandlers) handlers: RoomsHandlers,
    @inject(RoomScopeHandlers) scopeHandlers: RoomScopeHandlers,
    @inject(ResourceGrantCache) grants: ResourceGrantCache,
  ) {
    this.router = RoomRoutes.define(handlers, scopeHandlers, grants);
  }
  private static define(
    handlers: RoomsHandlers,
    scopeHandlers: RoomScopeHandlers,
    grants: ResourceGrantCache,
  ) {
    const router = new Hono<RoomContext>().basePath("/parties/room/:roomId");

    router.onError(handleError);
    router.use("*", cors({ origin: "*" }));
    const withBindRoomScope = router.post(
      "/service/bind-scope",
      scopeHandlers.bindRoomScope,
    );
    const withInvalidateRoom = withBindRoomScope.post(
      "/service/authorization/invalidate",
      scopeHandlers.invalidateRoom,
    );
    router.use("*", roomAuthorization(grants));
    const withRoomPush = withInvalidateRoom.post(
      "/replicache-push",
      handlers.roomPush,
    );
    const withRoomPull = withRoomPush.post(
      "/replicache-pull",
      handlers.roomPull,
    );
    const withGenerateCallToken = withRoomPull.get(
      "/token",
      handlers.generateCallToken,
    );

    return withGenerateCallToken;
  }
}

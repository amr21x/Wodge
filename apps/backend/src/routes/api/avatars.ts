import { Hono } from "hono";
import { inject, injectable } from "tsyringe";
import { AvatarHandlers } from "../../handlers/api/avatar";
import type { ApiContext } from "../../types/hono-context";
@injectable()
export class AvatarRoutes {
  readonly router: ReturnType<typeof AvatarRoutes.define>;

  constructor(@inject(AvatarHandlers) handlers: AvatarHandlers) {
    this.router = AvatarRoutes.define(handlers);
  }
  private static define(handlers: AvatarHandlers) {
    const router = new Hono<ApiContext>();

    const withUserAvatar = router.on(
      ["POST", "DELETE"],
      "/users/:id/avatar",
      handlers.userAvatar,
    );
    const withWorkspaceAvatar = withUserAvatar.on(
      ["POST", "DELETE"],
      "/workspaces/:workspaceId/avatar",
      handlers.workspaceAvatar,
    );

    return withWorkspaceAvatar;
  }
}

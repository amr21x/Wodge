import { Hono } from "hono";
import { cors } from "hono/cors";
import { inject, injectable } from "tsyringe";
import { handleError } from "../errors/handler";
import { UserHandlers } from "../handlers/user/handlers";
import { actorContext } from "../middleware/actor";
import type { UserContext } from "../types/hono-context";
@injectable()
export class UserRoutes {
  readonly router: ReturnType<typeof UserRoutes.define>;

  constructor(@inject(UserHandlers) handlers: UserHandlers) {
    this.router = UserRoutes.define(handlers);
  }
  private static define(handlers: UserHandlers) {
    const router = new Hono<UserContext>().basePath("/parties/user/:userId");

    router.onError(handleError);
    router.use(
      "*",
      cors({ origin: "*", allowHeaders: ["x-file-path", "x-user-id"] }),
    );
    router.use("*", actorContext);
    const withUserPull = router.post("/replicache-pull", handlers.userPull);
    const withUserPush = withUserPull.post(
      "/replicache-push",
      handlers.userPush,
    );
    const withAddWorkspace = withUserPush.post(
      "/service/add-workspace",
      handlers.addWorkspace,
    );
    const withRemoveWorkspace = withAddWorkspace.post(
      "/service/remove-workspace",
      handlers.removeWorkspace,
    );
    const withPoke = withRemoveWorkspace.post("/service/poke", handlers.poke);
    const withUpdate = withPoke.post("/update", handlers.update);
    const withUploadAvatar = withUpdate.post("/avatar", handlers.uploadAvatar);
    const withDeleteAvatar = withUploadAvatar.delete(
      "/avatar",
      handlers.deleteAvatar,
    );

    return withDeleteAvatar;
  }
}

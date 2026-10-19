import { Hono } from "hono";
import { cors } from "hono/cors";
import { inject, injectable } from "tsyringe";
import { handleError } from "../errors/handler";
import { DiscussionsHandlers } from "../handlers/discussions/handlers";
import { actorContext } from "../middleware/actor";
import type { ThreadContext } from "../types/hono-context";
@injectable()
export class DiscussionRoutes {
  readonly router: ReturnType<typeof DiscussionRoutes.define>;

  constructor(@inject(DiscussionsHandlers) handlers: DiscussionsHandlers) {
    this.router = DiscussionRoutes.define(handlers);
  }
  private static define(handlers: DiscussionsHandlers) {
    const router = new Hono<ThreadContext>().basePath(
      "/parties/thread/:threadId",
    );

    router.onError(handleError);
    router.use("*", cors({ origin: "*" }));
    router.use("*", actorContext);
    const withThreadPush = router.post("/replicache-push", handlers.threadPush);
    const withThreadPull = withThreadPush.post(
      "/replicache-pull",
      handlers.threadPull,
    );

    return withThreadPull;
  }
}

import { Hono } from "hono";
import { inject, injectable } from "tsyringe";
import { handleError } from "../errors/handler";
import { PagesHandlers } from "../handlers/pages/handlers";
import { actorContext } from "../middleware/actor";
import type { PageContext } from "../types/hono-context";
@injectable()
export class PageRoutes {
  readonly router: ReturnType<typeof PageRoutes.define>;

  constructor(@inject(PagesHandlers) handlers: PagesHandlers) {
    this.router = PageRoutes.define(handlers);
  }
  private static define(handlers: PagesHandlers) {
    const router = new Hono<PageContext>().basePath("/parties/page/:pageId");

    router.onError(handleError);
    router.use("*", actorContext);
    const withPagePull = router.post("/replicache-pull", handlers.pagePull);
    const withPagePush = withPagePull.post(
      "/replicache-push",
      handlers.pagePush,
    );

    return withPagePush;
  }
}

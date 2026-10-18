import { Context } from "hono";
import { inject, injectable } from "tsyringe";
import { PageSync } from "../../lib/sync/pages";
import { repPull, repPush } from "../../lib/sync/replicache";
import type { PageContext } from "../../types/hono-context";

@injectable()
export class PagesHandlers {
  constructor(@inject(PageSync) private readonly pageSync: PageSync) {}
  pagePull = async (c: Context<PageContext>) => {
    const { userId, isAdmin, isOwner, isTeamModerator, canView } =
      c.get("actor");

    if (!canView && !isAdmin && !isOwner && !isTeamModerator) {
      return c.json({ ok: false, error: "Unauthorized" }, 401);
    }

    return await repPull({
      req: c.req,
      storage: this.pageSync.storage,
      versions: this.pageSync.versions,
      patcher: this.pageSync.patch(userId),
    });
  };

  pagePush = async (c: Context<PageContext>) => {
    const wid = c.req.header("x-workspace-id");

    if (!wid) {
      return c.json({ ok: false, error: "Bad request" }, 400);
    }

    const res = await repPush({
      req: c.req,
      storage: this.pageSync.storage,
      versions: this.pageSync.versions,
      runner: (params) =>
        this.pageSync.run(params, { ...c.get("actor"), userId: params.userId }),
    });

    if (res.status === 200) {
      await this.pageSync.notify(wid);
    }

    return res;
  };
}

import { Context } from "hono";
import { inject, injectable } from "tsyringe";
import { ThreadSync } from "../../lib/sync/discussions";
import { repPull, repPush } from "../../lib/sync/replicache";
import type { ThreadContext } from "../../types/hono-context";

@injectable()
export class DiscussionsHandlers {
  constructor(@inject(ThreadSync) private readonly threadSync: ThreadSync) {}
  threadPull = async (c: Context<ThreadContext>) => {
    const { userId } = c.get("actor");

    return await repPull({
      req: c.req,
      storage: this.threadSync.storage,
      versions: this.threadSync.versions,
      patcher: this.threadSync.patch(userId),
    });
  };

  threadPush = async (c: Context<ThreadContext>) => {
    const wid = c.req.header("x-workspace-id");

    if (!wid) {
      return c.json({ ok: false, error: "Bad request" }, 400);
    }

    const res = await repPush({
      req: c.req,
      storage: this.threadSync.storage,
      versions: this.threadSync.versions,
      runner: async (params) => {
        try {
          await this.threadSync.run(params, {
            ...c.get("actor"),
            userId: params.userId,
          });
        } catch {
          return;
        }
      },
    });

    if (res.status === 200) {
      await this.threadSync.notify(wid);
    }

    return res;
  };
}

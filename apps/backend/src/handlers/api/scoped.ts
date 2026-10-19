import type { Context } from "hono";
import { getServerByName } from "partyserver";
import { inject, injectable } from "tsyringe";
import { WorkspaceGateway } from "../../gateways/workspace";
import { authorizeChannel } from "../../middleware/auth";
import type { ApiContext } from "../../types/hono-context";
import { SyncTargetHeaders, type SyncTarget } from "../../validators/sync";

@injectable()
export class ScopedHandlers {
  constructor(
    @inject(WorkspaceGateway) private readonly gateway: WorkspaceGateway,
  ) {}
  forwardScoped = async (
    c: Context<ApiContext>,
    namespace: SyncTarget["namespace"],
    id: string,
    path: string,
  ) => {
    const user = c.get("user");

    if (namespace === "user" && id !== user.id) {
      return c.json({ error: "Forbidden" }, 403);
    }

    const url = new URL(c.req.url);

    url.pathname = `/parties/${namespace}/${encodeURIComponent(id)}${path}`;
    const request = new Request(url, c.req.raw);

    // Replace caller-supplied identity and role headers with verified request context.
    for (const key of [
      "x-user-id",
      "x-session-id",
      "x-username",
      "channel-auth",
      "x-admin",
      "x-owner",
      "x-team-moderator",
      "x-can-edit",
      "x-can-view",
    ]) {
      request.headers.delete(key);
    }

    request.headers.set("x-user-id", user.id);
    request.headers.set("x-session-id", c.get("sessionId"));

    if (user.username) {
      request.headers.set("x-username", user.username);
    }

    // Page/thread use the compatibility grant path; rooms resolve scoped grants inside their DO.
    if (namespace === "thread" || namespace === "page") {
      if (
        !(await authorizeChannel(request, this.gateway, user.id, namespace, id))
      ) {
        return c.json({ error: "Forbidden" }, 403);
      }
    }

    request.headers.set("authorization", c.env.SECRET_KEY);
    const targets = {
      user: () => getServerByName(c.env.User, id),
      workspace: () => getServerByName(c.env.Workspace, id),
      room: () => getServerByName(c.env.Room, id),
      thread: () => getServerByName(c.env.Thread, id),
      page: () => getServerByName(c.env.Page, id),
    };
    const server = await targets[namespace]();

    return server.fetch(request);
  };

  syncRequest = (c: Context<ApiContext>) => {
    const target = SyncTargetHeaders.safeParse({
      namespace: c.req.header("domain"),
      id: c.req.header("id"),
    });

    if (!target.success) {
      return c.json({ error: "Invalid sync target" }, 400);
    }

    return this.forwardScoped(
      c,
      target.data.namespace,
      target.data.id,
      `/replicache-${c.req.param("mode")}`,
    );
  };
}

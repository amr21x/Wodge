import { BetterAuthMembership } from "@wodge/auth/membership";
import { AccountService } from "@wodge/core/user/services/account";
import { workspaceError } from "@wodge/core/workspace/errors";
import { WorkspaceManagement } from "@wodge/core/workspace/services/management";
import {
  makeUserAvatarKey,
  makeWorkspaceAvatarKey,
} from "@wodge/domain/files/index";
import type { Context } from "hono";
import { inject, injectable } from "tsyringe";
import { WorkspaceGateway } from "../../gateways/workspace";
import type { ApiContext } from "../../types/hono-context";
import { ScopedHandlers } from "./scoped";

@injectable()
export class AvatarHandlers {
  constructor(
    @inject(WorkspaceManagement)
    private readonly management: WorkspaceManagement,
    @inject(ScopedHandlers) private readonly scoped: ScopedHandlers,
    @inject(AccountService) private readonly users: AccountService,
    @inject(BetterAuthMembership)
    private readonly memberships: BetterAuthMembership,
    @inject(WorkspaceGateway)
    private readonly workspaceGateway: WorkspaceGateway,
  ) {}

  userAvatar = async (c: Context<ApiContext>) => {
    const user = c.get("user");

    if (c.req.param("id") !== user.id) {
      return c.json({ error: "Forbidden" }, 403);
    }

    if (c.req.method === "POST") {
      const key = c.req.header("key");

      if (!key || !/^[\w=-]{1,80}$/.test(key)) {
        return c.json({ error: "Invalid avatar key" }, 400);
      }

      const result = await this.users.update(user.id, {
        avatar: `${c.env.AVATARS_URL}/${makeUserAvatarKey(key)}`,
      });

      if (result.error) {
        return c.json({ error: result.error }, 400);
      }

      return this.scoped.forwardScoped(c, "user", user.id, "/update");
    }

    const removed = await this.scoped.forwardScoped(
      c,
      "user",
      user.id,
      "/avatar",
    );

    if (!removed.ok) {
      return removed;
    }

    const result = await this.users.update(user.id, { avatar: null });

    if (result.error) {
      return c.json({ error: result.error }, 400);
    }

    return c.body(null, 204);
  };

  workspaceAvatar = async (c: Context<ApiContext>) => {
    const id = c.req.param("workspaceId")!;

    if (!(await this.memberships.isAdmin(c.get("user").id, id)))
      throw workspaceError(
        "WORKSPACE_FORBIDDEN",
        "Workspace administrator access is required",
      );

    if (c.req.method === "POST") {
      const key = c.req.header("key");

      if (!key || !/^[\w=-]{1,80}$/.test(key)) {
        return c.json({ error: "Invalid avatar key" }, 400);
      }

      await this.memberships.update(
        id,
        { avatar: `${c.env.AVATARS_URL}/${makeWorkspaceAvatarKey(key)}` },
        c.req.raw.headers,
      );
    } else {
      const workspace = await this.management.get(id);

      if (workspace?.avatar?.startsWith(c.env.AVATARS_URL + "/")) {
        const url = new URL(c.req.url);

        url.searchParams.set("key", workspace.avatar.split("/").pop()!);
        const previous = c.req.raw;

        c.req.raw = new Request(url, previous);
        const response = await this.scoped.forwardScoped(
          c,
          "workspace",
          id,
          "/avatar",
        );

        c.req.raw = previous;

        if (!response.ok) {
          return response;
        }
      }

      await this.memberships.update(id, { avatar: null }, c.req.raw.headers);
    }

    await this.workspaceGateway.refreshMetadata(id);

    return c.body(null, 204);
  };
}

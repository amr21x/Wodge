import { UserSync } from "../../lib/sync/user";
import { UserAvatars } from "@wodge/core/user/services/avatars";
import { UserService } from "@wodge/core/user/services/memberships";
import { PokeMessage } from "@wodge/domain/sync/index";
import { HttpClient } from "@wodge/infra/http/client";
import { S3ObjectStorage } from "@wodge/infra/storage/object-storage";
import type { Context } from "hono";
import { inject, injectable } from "tsyringe";
import { UserNotifications } from "../../gateways/user-notifications";
import { readJson } from "../../lib/helpers/json";
import { readUpload } from "../../lib/helpers/upload";
import UserServer from "../../servers/user";
import type { UserContext } from "../../types/hono-context";
import { AvatarKey } from "../../validators/files";
import { RemoveWorkspaceBody } from "../../validators/user";

@injectable()
export class UserHandlers {
  constructor(
    @inject(UserSync) private readonly sync: UserSync,
    @inject(S3ObjectStorage) private readonly storage: S3ObjectStorage,
    @inject(HttpClient) private readonly http: HttpClient,
    @inject(UserNotifications)
    private readonly notifications: UserNotifications,
    @inject("user") private readonly party: UserServer,
    @inject(UserService) private readonly userService: UserService,
    @inject(UserAvatars) private readonly userAvatars: UserAvatars,
  ) {}
  addWorkspace = async (c: Context<UserContext>) => {
    const workspaceId = c.req.header("workspaceId");

    if (!workspaceId) {
      return c.json({ ok: false, error: "Bad request" }, 400);
    }

    await this.userService.addWorkspace(workspaceId);

    return c.json({ ok: true }, 200);
  };

  deleteAvatar = async (c: Context<UserContext>) => {
    const location = this.userAvatars.location(
      c.req.query("key") ? AvatarKey.parse(c.req.query("key")) : undefined,
    );
    const head = await this.http.request(
      await this.storage.headUrl(location, 3600),
      { method: "HEAD" },
    );
    if (head.status === 404) {
      await this.updateMemberships();
      return c.json({ message: "File does not exist" }, 200);
    }
    if (!head.ok) throw new Error("Unable to inspect avatar");
    await head.body?.cancel();
    const response = await this.http.request(
      await this.storage.deleteUrl(location, 3600),
      { method: "DELETE" },
    );
    if (response.status !== 204)
      return c.json({ message: "File not deleted" }, 400);
    await response.body?.cancel();
    await this.updateMemberships();
    return c.json({ message: "File deleted successfully" }, 200);
  };

  poke = async (c: Context<UserContext>) => {
    const body = <PokeMessage>await readJson(c.req);

    this.party.poke(body);

    return c.json({ ok: true }, 200);
  };

  userPull = (c: Context<UserContext>) => this.sync.pull(c.req);
  userPush = (c: Context<UserContext>) => this.sync.push(c.req);

  removeWorkspace = async (c: Context<UserContext>) => {
    const parsed = RemoveWorkspaceBody.safeParse(await readJson(c.req));

    if (!parsed.success) {
      return c.json({ ok: false, error: "Bad request" }, 400);
    }

    const { workspaceId } = parsed.data;

    await this.userService.removeWorkspace(workspaceId);
    this.notifications.removed(workspaceId);

    return c.json({ ok: true }, 200);
  };

  update = async (c: Context<UserContext>) => {
    await this.updateMemberships();

    return c.json({ ok: true }, 200);
  };

  uploadAvatar = async (c: Context<UserContext>) => {
    const service = this.userAvatars;
    const file = await readUpload(c.req);
    const requested = c.req.query("key");
    const { key, ...location } = service.newAvatar(
      requested ? AvatarKey.parse(requested) : undefined,
    );
    const response = await this.storage.putObject({
      ...location,
      Body: file,
      ContentType: file.type,
    });
    await this.updateMemberships();
    return c.json({ key, response }, 200);
  };
  private async updateMemberships() {
    await Promise.all(
      (await this.userService.listWorkspaceIds()).map((id) =>
        this.notifications.updateMember(id),
      ),
    );
  }
}

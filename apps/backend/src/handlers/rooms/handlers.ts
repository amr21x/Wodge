import {
  requireRoomPermission,
  roomMutationActions,
} from "@wodge/auth/authorization/room-permissions";
import { LiveKitCallTokens } from "@wodge/infra/calls/livekit";
import type { Context } from "hono";
import { inject, injectable } from "tsyringe";
import { readJson } from "../../lib/helpers/json";
import { repPull, repPush } from "../../lib/sync/replicache";
import { RoomSync } from "../../lib/sync/rooms";
import { PushRequestSchema } from "../../lib/sync/validation";
import type { RoomContext } from "../../types/hono-context";

@injectable()
export class RoomsHandlers {
  constructor(
    @inject(RoomSync) private readonly roomSync: RoomSync,
    @inject(LiveKitCallTokens) private readonly tokens: LiveKitCallTokens,
    @inject("objectId") private readonly roomId: string,
  ) {}
  generateCallToken = async (c: Context<RoomContext>) => {
    const token = await this.tokens.issue({
      room: this.roomId,
      identity: c.req.header("x-user-id"),
      name: c.req.header("x-username") || "User",
      ttl: "10m",
      canPublish: true,
      canSubscribe: true,
    });

    return c.json({ token }, 200);
  };

  roomPull = async (c: Context<RoomContext>) => {
    const { userId } = c.get("actor");

    return await repPull({
      req: c.req,
      storage: this.roomSync.storage,
      versions: this.roomSync.versions,
      patcher: this.roomSync.patch(userId),
    });
  };

  roomPush = async (c: Context<RoomContext>) => {
    const wid = c.get("actor").workspaceId;

    if (!wid) {
      return c.json({ ok: false, error: "Bad request" }, 400);
    }

    const body = PushRequestSchema.safeParse(await readJson(c.req));
    if (!body.success) {
      return c.json({ ok: false, error: "Bad request" }, 400);
    }
    // Reject a forbidden batch before running any command or advancing an acknowledgement.
    for (const mutation of body.data.mutations) {
      if (Object.hasOwn(roomMutationActions, mutation.name)) {
        requireRoomPermission(
          c.get("actor"),
          roomMutationActions[
            mutation.name as keyof typeof roomMutationActions
          ],
        );
      }
    }

    const res = await repPush({
      req: c.req,
      storage: this.roomSync.storage,
      versions: this.roomSync.versions,
      runner: async (params) => {
        try {
          await this.roomSync.run(params, {
            ...c.get("actor"),
            userId: params.userId,
          });
        } catch (error) {
          if (
            error instanceof Error &&
            "code" in error &&
            error.code === "ROOM_FORBIDDEN"
          ) {
            throw error;
          }
          return;
        }
      },
    });

    if (res.status === 200) {
      await this.roomSync.notify(wid);
    }

    return res;
  };
}

import {
  requireRoomPermission,
  roomMutationActions,
} from "@wodge/auth/authorization/room-permissions";
import type { Context } from "hono";
import { inject, injectable } from "tsyringe";
import { readJson } from "../../lib/helpers/json";
import { repPull, repPush } from "../../lib/sync/replicache";
import { RoomSync } from "../../lib/sync/rooms";
import { PushRequestSchema } from "../../lib/sync/validation";
import type { RoomContext } from "../../types/hono-context";

@injectable()
export class RoomsHandlers {
  constructor(@inject(RoomSync) private readonly roomSync: RoomSync) {}
  generateCallToken = async (c: Context<RoomContext>) => {
    return c.json(
      {
        ok: false,
        error: {
          code: "CALLS_DISABLED",
          message:
            "Calls are disabled in this showcase. Room messaging remains available.",
        },
      },
      403,
    );
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

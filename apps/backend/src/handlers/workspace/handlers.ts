import { AuthorizationRevocations } from "@wodge/auth/authorization/revocations";
import { WorkspaceAuthorization } from "@wodge/auth/authorization/service";
import { WorkspaceAccess } from "@wodge/auth/authorization/workspace-access";
import { BetterAuthMembership } from "@wodge/auth/membership";
import { WorkspaceDirectory } from "@wodge/core/workspace/services/directory";
import { WorkspaceLifecycle } from "@wodge/core/workspace/services/lifecycle";
import { getBucketAddress } from "@wodge/domain/files/index";
import { PresenceInputSchema } from "@wodge/domain/workspace/validation";
import { S3ObjectStorage } from "@wodge/infra/storage/object-storage";
import type { Context } from "hono";
import { inject, injectable } from "tsyringe";
import { z } from "zod";
import { RoomGateway } from "../../gateways/room";
import { WorkspaceMemberships } from "../../gateways/workspace-memberships";
import { WorkspaceNotifications } from "../../gateways/workspace-notifications";
import { AuthorizationInvalidations } from "../../lib/authorization/invalidation";
import { readJson } from "../../lib/helpers/json";
import { repPull, repPush } from "../../lib/sync/replicache";
import { WorkspaceSync } from "../../lib/sync/workspace";
import type { WorkspaceContext } from "../../types/hono-context";
import { ChannelAccessHeaders } from "../../validators/workspace";
const synchronizationBody = z.object({ deleted: z.boolean() }).strict();
@injectable()
export class WorkspaceHandlers {
  constructor(
    @inject(AuthorizationRevocations)
    private readonly revocations: AuthorizationRevocations,
    @inject(WorkspaceMemberships)
    private readonly memberships: WorkspaceMemberships,
    @inject(S3ObjectStorage) private readonly storage: S3ObjectStorage,
    @inject(WorkspaceSync) private readonly workspaceSync: WorkspaceSync,
    @inject(WorkspaceNotifications)
    private readonly workspaceNotifications: WorkspaceNotifications,
    @inject("objectId") private readonly workspaceId: string,
    @inject(WorkspaceAccess) private readonly workspaceAccess: WorkspaceAccess,
    @inject(WorkspaceLifecycle)
    private readonly workspaceLifecycle: WorkspaceLifecycle,
    @inject(BetterAuthMembership)
    private readonly betterAuthMembership: BetterAuthMembership,
    @inject(AuthorizationInvalidations)
    private readonly authorizationInvalidations: AuthorizationInvalidations,
    @inject(RoomGateway) private readonly roomGateway: RoomGateway,
    @inject(WorkspaceDirectory)
    private readonly workspaceDirectory: WorkspaceDirectory,
    @inject(WorkspaceAuthorization)
    private readonly workspaceAuthorization: WorkspaceAuthorization,
  ) {}
  refreshMetadata = async (c: Context<WorkspaceContext>) => {
    await this.workspaceLifecycle.updateWorkspace();
    await this.workspaceNotifications.notify({
      type: "workspaceInfo",
      id: this.workspaceId,
    });
    return c.body(null, 204);
  };

  authChannel = (c: Context<WorkspaceContext>) => {
    if (c.req.header("x-workspace-id") !== this.workspaceId) {
      return c.json({ ok: false, error: "Unauthorized" }, 401);
    }

    return c.json(
      this.workspaceAccess.authorize(
        ChannelAccessHeaders.parse({
          userId: c.req.header("x-user-id"),
          teamId: c.req.header("x-team-id"),
          folderId: c.req.header("x-folder-id"),
          channelId: c.req.header("x-channel-id"),
          channelType: c.req.header("x-channel-type"),
        }),
      ),
      200,
    );
  };

  channelPoke = async (c: Context<WorkspaceContext>) => {
    const channelId = c.req.header("channelId");

    if (!channelId) {
      return c.json({ ok: false, error: "Bad request" }, 400);
    }

    await this.workspaceNotifications.notify({
      type: "channel",
      id: channelId,
    });

    return c.json({ ok: true }, 200);
  };

  refreshMembers = async (c: Context<WorkspaceContext>) => {
    const success = await this.workspaceLifecycle.refreshMembers();

    return success
      ? c.json({ ok: true }, 200)
      : c.json({ ok: false, error: "Bad request" }, 400);
  };

  poke = async (c: Context<WorkspaceContext>) => {
    await this.workspaceNotifications.notify({
      type: "workspaceInfo",
    });

    return c.json({ ok: true }, 200);
  };

  handlePresence = async (c: Context<WorkspaceContext>) => {
    const parsed = PresenceInputSchema.safeParse(await readJson(c.req));

    if (!parsed.success) {
      return c.json({ ok: false, error: "Bad request" }, 400);
    }

    const { userId, connect } = parsed.data;

    return (await this.workspaceLifecycle.setPresence(userId, connect))
      ? c.json({ ok: true }, 200)
      : c.json({ ok: false, error: "Unauthorized" }, 401);
  };

  workspacePull = async (c: Context<WorkspaceContext>) => {
    const { userId } = c.get("actor");

    return await repPull({
      req: c.req,
      storage: this.workspaceSync.storage,
      versions: this.workspaceSync.versions,
      patcher: this.workspaceSync.patch(userId),
    });
  };

  workspacePush = async (c: Context<WorkspaceContext>) => {
    const res = await repPush({
      req: c.req,
      storage: this.workspaceSync.storage,
      versions: this.workspaceSync.versions,
      runner: async (params) => {
        await this.workspaceSync.run(params, {
          ...c.get("actor"),
          userId: params.userId,
        });
      },
    });

    if (res.status === 200) {
      await this.bindRooms();
      await this.authorizationInvalidations.flush();
      await this.workspaceNotifications.notify();
    }

    return res;
  };

  synchronizeOrganization = async (c: Context<WorkspaceContext>) => {
    const { deleted } = synchronizationBody.parse(await readJson(c.req));
    const snapshot = await this.betterAuthMembership.snapshot(this.workspaceId);
    if (!snapshot) {
      if (!deleted) {
        return c.json({ error: "Organization not found" }, 404);
      }
      for (const memberId of this.workspaceLifecycle.memberIds()) {
        await this.revocations.revokeUserAssignments(memberId);
        const result = await this.memberships.remove(memberId);
        if (!result.ok) throw new Error("Workspace projection removal failed");
      }
      await this.workspaceNotifications.notify({
        type: "deleteWorkspace",
        id: this.workspaceId,
      });
      await this.authorizationInvalidations.policyChanged();
      const ok = await this.workspaceLifecycle.deleteWorkspace();
      return c.json({ ok }, ok ? 200 : 503);
    }
    if (deleted) {
      return c.json({ error: "Organization still exists" }, 409);
    }
    const currentIds = new Set(snapshot.members.map((member) => member.userId));
    for (const memberId of this.workspaceLifecycle.memberIds()) {
      if (!currentIds.has(memberId)) {
        await this.revocations.revokeUserAssignments(memberId);
        const result = await this.memberships.remove(memberId);
        if (!result.ok) throw new Error("Workspace projection removal failed");
      }
    }
    // Replaying every desired membership repairs an earlier partial synchronization.
    for (const member of snapshot.members) {
      const result = await this.memberships.add(member.userId);
      if (!result.ok) throw new Error("Workspace projection addition failed");
    }
    if (!this.workspaceLifecycle.initialized)
      await this.storage.createBucket({
        Bucket: getBucketAddress(this.workspaceId),
      });
    await this.workspaceLifecycle.synchronizeMembers(snapshot.members);
    await this.bindRooms();
    const owner = snapshot.members.find((member) =>
      member.role.split(",").includes("owner"),
    );
    if (owner) {
      await this.workspaceDirectory.ensureInvite(
        owner.userId,
        this.workspaceId,
      );
    }
    await this.workspaceAuthorization.synchronizeOrganizationRoles();
    await this.authorizationInvalidations.policyChanged();
    await this.workspaceLifecycle.updateWorkspace();
    await this.workspaceNotifications.notify({
      type: "workspaceMembers",
      id: this.workspaceId,
    });
    return c.json({ ok: true }, 200);
  };

  async bindRooms() {
    for (const { roomId, teamId } of this.workspaceLifecycle.roomScopes())
      await this.roomGateway.bindRoom(roomId, teamId);
  }
}

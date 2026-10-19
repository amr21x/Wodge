import { WorkspaceAccess } from "@wodge/auth/authorization/workspace-access";
import { BetterAuthMembership } from "@wodge/auth/membership";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { inject, injectable } from "tsyringe";
import { handleError } from "../errors/handler";
import { PermissionHandlers } from "../handlers/authorization/permissions";
import { WorkspaceFilesHandlers } from "../handlers/workspace/files";
import { WorkspaceHandlers } from "../handlers/workspace/handlers";
import { actorContext } from "../middleware/actor";
import { requireWorkspaceAccess } from "../middleware/workspace/access";
import { workspaceMembership } from "../middleware/workspace/membership";
import type { WorkspaceContext } from "../types/hono-context";
import { AuthorizationRoutes } from "./authorization";
@injectable()
export class WorkspaceRoutes {
  readonly router: ReturnType<typeof WorkspaceRoutes.define>;

  constructor(
    @inject(WorkspaceFilesHandlers) files: WorkspaceFilesHandlers,
    @inject(WorkspaceHandlers) handlers: WorkspaceHandlers,
    @inject(PermissionHandlers) permissionHandlers: PermissionHandlers,
    @inject(AuthorizationRoutes) authorization: AuthorizationRoutes,
    @inject(WorkspaceAccess) access: WorkspaceAccess,
    @inject(BetterAuthMembership) memberships: BetterAuthMembership,
    @inject("objectId") workspaceId: string,
  ) {
    this.router = WorkspaceRoutes.define(
      files,
      handlers,
      permissionHandlers,
      authorization,
      access,
      memberships,
      workspaceId,
    );
  }
  private static define(
    files: WorkspaceFilesHandlers,
    handlers: WorkspaceHandlers,
    permissionHandlers: PermissionHandlers,
    authorization: AuthorizationRoutes,
    access: WorkspaceAccess,
    memberships: BetterAuthMembership,
    workspaceId: string,
  ) {
    const router = new Hono<WorkspaceContext>().basePath(
      "/parties/workspace/:workspaceId",
    );

    router.onError(handleError);
    router.use(
      "*",
      cors({ origin: "*", allowHeaders: ["x-file-path", "x-user-id"] }),
    );
    router.use("*", actorContext);
    router.use("*", workspaceMembership(memberships, access, workspaceId));
    const withAuthorization = router.route(
      "/authorization",
      authorization.router,
    );
    const withWorkspacePull = withAuthorization.post(
      "/replicache-pull",
      handlers.workspacePull,
    );
    const withWorkspacePush = withWorkspacePull.post(
      "/replicache-push",
      handlers.workspacePush,
    );
    const withListFiles = withWorkspacePush.get(
      "/files/:teamId/:path?",
      requireWorkspaceAccess("team-read", access),
      files.listFiles,
    );
    const withUploadFile = withListFiles.post(
      "/files/:teamId/:path?",
      requireWorkspaceAccess("team-write", access),
      files.uploadFile,
    );
    const withDeleteFile = withUploadFile.delete(
      "/files/:teamId/:path?",
      requireWorkspaceAccess("team-write", access),
      (c) => files.deleteFile(c, "file"),
    );
    const withDownloadFile = withDeleteFile.get(
      "/file/:teamId/:path",
      requireWorkspaceAccess("team-read", access),
      files.downloadFile,
    );
    const withDownloadFileGet = withDownloadFile.get(
      "/file/:teamId/:channelId/:path?",
      requireWorkspaceAccess("channel-read", access),
      files.downloadFile,
    );
    const withUploadFilePost = withDownloadFileGet.post(
      "/file/:teamId/:channelId/:path?",
      requireWorkspaceAccess("channel-write", access),
      files.uploadFile,
    );
    const withRefreshMetadata = withUploadFilePost.post(
      "/service/metadata-update",
      handlers.refreshMetadata,
    );
    const withSynchronizeOrganization = withRefreshMetadata.post(
      "/service/organization-sync",
      handlers.synchronizeOrganization,
    );
    const withRoomGrant = withSynchronizeOrganization.post(
      "/service/authorization/grant",
      permissionHandlers.roomGrant,
    );
    const withAuthChannel = withRoomGrant.get(
      "/service/auth-channel",
      handlers.authChannel,
    );
    const withHandlePresence = withAuthChannel.post(
      "/service/presence",
      handlers.handlePresence,
    );
    const withRefreshMembers = withHandlePresence.post(
      "/service/member-update",
      handlers.refreshMembers,
    );
    const withChannelPoke = withRefreshMembers.post(
      "/service/poke-channel",
      handlers.channelPoke,
    );
    const withPoke = withChannelPoke.post("/service/poke", handlers.poke);
    const withUploadAvatar = withPoke.post(
      "/avatar",
      requireWorkspaceAccess("admin", access),
      files.uploadAvatar,
    );
    const withDeleteFileDelete = withUploadAvatar.delete(
      "/avatar",
      requireWorkspaceAccess("admin", access),
      (c) => files.deleteFile(c, "avatar"),
    );

    return withDeleteFileDelete;
  }
}

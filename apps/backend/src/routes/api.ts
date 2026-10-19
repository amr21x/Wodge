import { FeatureHandlers } from "../handlers/features";
import type { WithPathParameter } from "../types/proxy";
import type { ExtractSchema } from "hono/types";
import type { AuthorizationRoutes } from "./authorization";
import type { RoomRoutes } from "./rooms";
import type { AuthInstance } from "@wodge/auth/server";
import { Hono } from "hono";
import { inject, injectable } from "tsyringe";
import { ScopedHandlers } from "../handlers/api/scoped";
import { authenticated } from "../middleware/api";
import type { ApiContext } from "../types/hono-context";
import { AccountRoutes } from "./api/accounts";
import { AvatarRoutes } from "./api/avatars";
import { BillingRoutes } from "./api/billing";
import { WorkspaceApiRoutes } from "./api/workspaces";

@injectable()
export class ApiRoutes {
  readonly router: ReturnType<typeof ApiRoutes.define>;
  constructor(
    @inject(FeatureHandlers) features: FeatureHandlers,
    @inject("auth") auth: AuthInstance,
    @inject(ScopedHandlers) scopedHandlers: ScopedHandlers,
    @inject(AccountRoutes) accounts: AccountRoutes,
    @inject(AvatarRoutes) avatars: AvatarRoutes,
    @inject(BillingRoutes) billing: BillingRoutes,
    @inject(WorkspaceApiRoutes) workspaces: WorkspaceApiRoutes,
  ) {
    this.router = ApiRoutes.define(
      features,
      auth,
      scopedHandlers,
      accounts,
      avatars,
      billing,
      workspaces,
    );
  }
  private static define(
    features: FeatureHandlers,
    auth: AuthInstance,
    scopedHandlers: ScopedHandlers,
    accounts: AccountRoutes,
    avatars: AvatarRoutes,
    billing: BillingRoutes,
    workspaces: WorkspaceApiRoutes,
  ) {
    const router = new Hono<ApiContext>();

    // Establish user/session variables before any child router resolves its handlers.
    router.use("*", authenticated(auth));
    router.use("*", async (c, next) => {
      const denied =
        c.req.path === "/api/users/update" && c.get("user").username
          ? await features.check(["profiles"])
          : await features.http(c.req.raw);
      if (denied) return denied;
      await next();
    });

    // Workspace policy lives in its DO; the Worker authenticates and forwards these operations.
    const authorizationProxy = new Hono<ApiContext>();
    authorizationProxy.all("/*", (c) =>
      scopedHandlers.forwardScoped(
        c,
        "workspace",
        c.req.param("workspaceId")!,
        "/authorization/" + c.req.path.split("/authorization/")[1],
      ),
    );
    // The Worker forwards these paths unchanged; the owning object supplies their contract.
    const authorization = authorizationProxy as Hono<
      ApiContext,
      WithPathParameter<
        ExtractSchema<AuthorizationRoutes["router"]>,
        "workspaceId"
      >
    >;
    const withAuthorization = router.route(
      "/workspaces/:workspaceId/authorization",
      authorization,
    );
    const withSyncRequest = withAuthorization.post(
      "/replicache/:mode{pull|push}",
      scopedHandlers.syncRequest,
    );
    const roomTokenProxy = new Hono<ApiContext>();
    roomTokenProxy.get("/token", (c) =>
      scopedHandlers.forwardScoped(
        c,
        "room",
        c.req.param("channelId")!,
        "/token",
      ),
    );
    type TokenSchema = Pick<
      ExtractSchema<RoomRoutes["router"]>,
      "/parties/room/:roomId/token"
    >;
    type TokenEndpoint = TokenSchema["/parties/room/:roomId/token"]["$get"];
    type PublicTokenSchema = {
      "/token": {
        $get: Omit<TokenEndpoint, "input"> & {
          input: Omit<TokenEndpoint["input"], "param"> & {
            param: { channelId: string };
          };
        };
      };
    };
    const roomToken = roomTokenProxy as Hono<ApiContext, PublicTokenSchema>;
    const withRoomTokens = withSyncRequest.route(
      "/rooms/:channelId",
      roomToken,
    );
    const withFiles = withRoomTokens.on(
      ["GET", "POST", "DELETE"],
      "/workspaces/:workspaceId/files/:teamId/:path?",
      (c) =>
        scopedHandlers.forwardScoped(
          c,
          "workspace",
          c.req.param("workspaceId"),
          `/files/${encodeURIComponent(c.req.param("teamId"))}${c.req.param("path") ? "/" + encodeURIComponent(c.req.param("path")!) : ""}`,
        ),
    );
    const withDownloadFile = withFiles.get(
      "/workspaces/:workspaceId/file/:teamId/:path",
      (c) =>
        scopedHandlers.forwardScoped(
          c,
          "workspace",
          c.req.param("workspaceId"),
          `/file/${encodeURIComponent(c.req.param("teamId"))}/${encodeURIComponent(c.req.param("path"))}`,
        ),
    );
    const withDeleteFile = withDownloadFile.delete(
      "/workspaces/:workspaceId/file/:teamId/:path",
      (c) =>
        scopedHandlers.forwardScoped(
          c,
          "workspace",
          c.req.param("workspaceId"),
          `/files/${encodeURIComponent(c.req.param("teamId"))}/${encodeURIComponent(c.req.param("path"))}`,
        ),
    );

    // Handle specific mounts before broader groups sharing /users or /workspaces.
    const withAvatars = withDeleteFile.route("/", avatars.router);
    const withBilling = withAvatars.route(
      "/workspaces/:workspaceId/billing",
      billing.router,
    );
    const withWorkspaces = withBilling.route(
      "/users/workspaces",
      workspaces.directory,
    );
    const withAccounts = withWorkspaces.route("/users", accounts.router);
    const withWorkspacesRoute = withAccounts.route(
      "/workspaces",
      workspaces.router,
    );

    return withWorkspacesRoute;
  }
}

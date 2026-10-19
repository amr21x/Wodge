import type { AuthInstance } from "@wodge/auth/server";
import { SessionTickets } from "@wodge/auth/tickets";
import { AccountService } from "@wodge/core/user/services/account";
import { Hono } from "hono";
import { partyserverMiddleware } from "hono-party";
import { cors } from "hono/cors";
import { inject, injectable } from "tsyringe";
import { handleError } from "./errors/handler";
import { WorkspaceGateway } from "./gateways/workspace";
import { BillingHandlers } from "./handlers/api/billing";
import { partyIngress } from "./middleware/ingress";
import { ApiRoutes } from "./routes/api";
import type { ApiContext } from "./types/hono-context";
import type { WorkerEnvironment } from "./types/worker-environment";

@injectable()
export class BackendApplication {
  readonly router: ReturnType<typeof BackendApplication.define>;
  constructor(
    @inject("auth") auth: AuthInstance,
    @inject(BillingHandlers) billing: BillingHandlers,
    @inject(ApiRoutes) api: ApiRoutes,
    @inject(SessionTickets) tickets: SessionTickets,
    @inject(WorkspaceGateway) workspaceGateway: WorkspaceGateway,
    @inject(AccountService) accounts: AccountService,
  ) {
    this.router = BackendApplication.define(
      auth,
      billing,
      api,
      tickets,
      workspaceGateway,
      accounts,
    );
  }
  private static define(
    auth: AuthInstance,
    billing: BillingHandlers,
    api: ApiRoutes,
    tickets: SessionTickets,
    workspaceGateway: WorkspaceGateway,
    accounts: AccountService,
  ) {
    const router = new Hono<ApiContext>();

    router.onError(handleError);

    router.use(
      "*",
      cors({
        origin: (origin, c) =>
          origin === c.env.APP_DOMAIN ? origin : undefined,
        credentials: true,
      }),
    );

    const withHealth = router.get("/health", (c) => c.json({ ok: true }, 200));

    // Better Auth and signed webhooks authenticate themselves, before the API session guard.
    const withAuthentication = withHealth.all("/api/auth/*", (c) => {
      // Organization writes must pass through the coordinating backend handlers.
      const operation = c.req.path.slice("/api/auth".length);
      if (organizationWrites.has(operation))
        return c.json(
          { error: "Use the workspace API for this operation" },
          403,
        );
      return auth.handler(c.req.raw);
    });

    const withWebhook = withAuthentication.post(
      "/api/billing/webhook",
      billing.webhook,
    );

    const withApi = withWebhook.route("/api", api.router);

    // Verify identity and replace untrusted headers before the plugin can upgrade a WebSocket.
    router.use(
      "/parties/*",
      partyIngress(auth, tickets, workspaceGateway, accounts),
    );

    router.use("/parties/*", partyserverMiddleware<ApiContext>());

    router.notFound((c) => c.json({ error: "Not found" }, 404));

    return withApi;
  }
}

const organizationWrites = new Set([
  "/organization/create",
  "/organization/update",
  "/organization/delete",
  "/organization/add-member",
  "/organization/remove-member",
  "/organization/update-member-role",
  "/organization/leave",
  "/organization/invite-member",
  "/organization/accept-invitation",
  "/organization/reject-invitation",
  "/organization/cancel-invitation",
]);

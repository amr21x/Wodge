import { FeatureFlagHandlers } from "./handlers/feature-flags";
import type { AuthInstance } from "@wodge/auth/server";
import { SessionTickets } from "@wodge/auth/tickets";
import { IntegrationUnavailableError } from "@wodge/infra/integration-unavailable";
import { PolarPayments } from "@wodge/infra/payments/polar";
import { AccountService } from "@wodge/core/user/services/account";
import { Hono } from "hono";
import { partyserverMiddleware } from "hono-party";
import { cors } from "hono/cors";
import { inject, injectable } from "tsyringe";
import { handleError } from "./errors/handler";
import { WorkspaceGateway } from "./gateways/workspace";
import { partyIngress } from "./middleware/ingress";
import { ApiRoutes } from "./routes/api";
import type { ApiContext } from "./types/hono-context";

@injectable()
export class BackendApplication {
  readonly router: ReturnType<typeof BackendApplication.define>;
  constructor(
    @inject(FeatureFlagHandlers) features: FeatureFlagHandlers,
    @inject("auth") auth: AuthInstance,
    @inject(ApiRoutes) api: ApiRoutes,
    @inject(SessionTickets) tickets: SessionTickets,
    @inject(WorkspaceGateway) workspaceGateway: WorkspaceGateway,
    @inject(AccountService) accounts: AccountService,
    @inject(PolarPayments) payments: PolarPayments,
  ) {
    this.router = BackendApplication.define(
      features,
      auth,
      api,
      tickets,
      workspaceGateway,
      accounts,
      payments,
    );
  }
  private static define(
    features: FeatureFlagHandlers,
    auth: AuthInstance,
    api: ApiRoutes,
    tickets: SessionTickets,
    workspaceGateway: WorkspaceGateway,
    accounts: AccountService,
    payments: PolarPayments,
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

    const withFlags = router.get("/api/feature-flags", features.snapshot);
    const withHealth = withFlags.get("/health", (c) =>
      c.json({ ok: true }, 200),
    );

    // Better Auth and its signed Polar webhook authenticate themselves, before the API session guard.
    const withAuthentication = withHealth.all("/api/auth/*", (c) => {
      // Organization writes and billing must pass through the authorizing backend handlers.
      const operation = c.req.path.slice("/api/auth".length);
      if (
        organizationWrites.has(operation) ||
        billingOperations.test(operation)
      )
        return c.json(
          { error: "Use the workspace API for this operation" },
          403,
        );
      // Without configuration the Polar plugin is absent; report the capability as unavailable.
      if (operation === "/polar/webhooks" && !payments.webhooksConfigured)
        throw new IntegrationUnavailableError("Billing webhook");
      return auth.handler(c.req.raw);
    });

    const withApi = withAuthentication.route("/api", api.router);

    // Verify identity and replace untrusted headers before the plugin can upgrade a WebSocket.
    router.use(
      "/parties/*",
      partyIngress(auth, tickets, workspaceGateway, accounts),
    );

    router.use("/parties/*", async (c, next) => {
      const domain = c.req.path.split("/")[2];
      if (
        domain === "page" &&
        c.req.header("upgrade")?.toLowerCase() === "websocket"
      ) {
        const denied = await features.check(["pages"]);
        if (denied) return denied;
      }
      await next();
    });
    router.use("/parties/*", partyserverMiddleware<ApiContext>());

    router.notFound((c) => c.json({ error: "Not found" }, 404));

    return withApi;
  }
}

// The Polar plugin does not authorize workspace membership for checkout or customer endpoints.
const billingOperations = /^\/(?:checkout|customer|usage)(?:\/|$)/;

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

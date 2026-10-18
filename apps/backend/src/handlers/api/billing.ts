import { BetterAuthMembership } from "@wodge/auth/membership";
import { billingError } from "@wodge/core/billing/errors";
import { BillingService } from "@wodge/core/billing/services/billing";
import { StripePayments } from "@wodge/infra/payments/payments";
import { IntegrationUnavailableError } from "@wodge/infra/integration-unavailable";
import type { Context } from "hono";
import { inject, injectable } from "tsyringe";
import { WorkspaceGateway } from "../../gateways/workspace";
import type { ApiContext } from "../../types/hono-context";
import { WorkspaceParams } from "../../validators/workspace";

@injectable()
export class BillingHandlers {
  constructor(
    @inject(BillingService) private readonly billing: BillingService,
    @inject(StripePayments) private readonly payments: StripePayments,
    @inject(BetterAuthMembership)
    private readonly memberships: BetterAuthMembership,
    @inject(WorkspaceGateway) private readonly workspaces: WorkspaceGateway,
  ) {}

  checkout = async (c: Context<ApiContext>) => {
    const { workspaceId } = WorkspaceParams.parse(c.req.param());
    await this.requireAdmin(c.get("user").id, workspaceId);
    const workspace = await this.billing.checkout(workspaceId);
    const prices = await this.payments.listPrices(c.env.STRIPE_LOOKUP_KEY);
    const price = prices.data[0];
    if (!price) throw billingError("BILLING_PRICE_NOT_FOUND", "No price found");
    const session = await this.payments.createCheckout({
      billing_address_collection: "auto",
      line_items: [{ price: price.id, quantity: 1 }],
      mode: "subscription",
      success_url: `${c.env.APP_DOMAIN}/${workspace.slug}/billing/success`,
      cancel_url: `${c.env.APP_DOMAIN}/${workspace.slug}/billing/failure`,
      subscription_data: { metadata: { workspaceId: workspace.id } },
      customer_email: c.get("user").email,
    });
    if (!session.url)
      throw billingError(
        "BILLING_CHECKOUT_URL_MISSING",
        "Missing checkout URL",
      );
    return c.json({ url: session.url }, 200);
  };

  portal = async (c: Context<ApiContext>) => {
    const { workspaceId } = WorkspaceParams.parse(c.req.param());
    await this.requireAdmin(c.get("user").id, workspaceId);
    const workspace = await this.billing.portal(workspaceId);
    const session = await this.payments.createPortal({
      customer: workspace.customerId,
      return_url: `${c.env.APP_DOMAIN}/${workspace.slug}/settings/upgrade`,
    });
    return c.json({ url: session.url }, 200);
  };

  webhook = async (c: Context<ApiContext>) => {
    const signature = c.req.header("stripe-signature");
    if (!signature) return c.body(null, 400);
    const body = await c.req.text();
    let event;
    // Signature verification consumes the exact body bytes before parsing provider data.
    try {
      event = await this.payments.verifyEvent(
        body,
        signature,
        c.env.STRIPE_WH_SECRET,
      );
    } catch (error) {
      if (error instanceof IntegrationUnavailableError) throw error;
      return c.body(null, 400);
    }
    if (event.type === "ignored") return c.body(null, 200);
    const subscription = event.data.object;
    const workspaceId = subscription.metadata.workspaceId;
    if (
      !workspaceId ||
      (event.type === "customer.subscription.created" && !subscription.customer)
    )
      return c.body(null, 400);
    const premium = event.type === "customer.subscription.created";
    await this.billing.setSubscription(
      workspaceId,
      premium,
      premium ? subscription.customer! : null,
    );
    await this.workspaces.notify(workspaceId);
    return c.body(null, 200);
  };

  private async requireAdmin(userId: string, workspaceId: string) {
    if (!(await this.memberships.isAdmin(userId, workspaceId)))
      throw billingError(
        "BILLING_FORBIDDEN",
        "Workspace administrator access is required",
      );
  }
}

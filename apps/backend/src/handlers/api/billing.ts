import type { AuthInstance } from "@wodge/auth/server";
import { BetterAuthMembership } from "@wodge/auth/membership";
import { billingError } from "@wodge/core/billing/errors";
import { BillingService } from "@wodge/core/billing/services/billing";
import { IntegrationUnavailableError } from "@wodge/infra/integration-unavailable";
import { PolarPayments } from "@wodge/infra/payments/polar";
import type { Context } from "hono";
import { inject, injectable } from "tsyringe";
import type { ApiContext } from "../../types/hono-context";
import { WorkspaceParams } from "../../validators/workspace";

/** Workspace billing entry points. Better Auth's Polar endpoints are only reached from here. */
@injectable()
export class BillingHandlers {
  constructor(
    @inject(BillingService) private readonly billing: BillingService,
    @inject(PolarPayments) private readonly payments: PolarPayments,
    @inject(BetterAuthMembership)
    private readonly memberships: BetterAuthMembership,
    @inject("auth") private readonly auth: AuthInstance,
  ) {}

  checkout = async (c: Context<ApiContext>) => {
    const { workspaceId } = WorkspaceParams.parse(c.req.param());
    await this.requireAdmin(c.get("user").id, workspaceId);
    const workspace = await this.billing.checkout(workspaceId);
    const productId = this.payments.productId;
    // The redirect is not payment evidence; only verified webhooks change entitlements.
    const session = await this.auth.api.checkout({
      headers: c.req.raw.headers,
      body: {
        products: [productId],
        reference_id: workspace.id,
        success_url: `${c.env.APP_DOMAIN}/${workspace.slug}/billing/success?checkout_id={CHECKOUT_ID}`,
        return_url: `${c.env.APP_DOMAIN}/${workspace.slug}/settings/upgrade`,
        redirect: false,
      },
    });
    return c.json({ url: session.url }, 200);
  };

  portal = async (c: Context<ApiContext>) => {
    const { workspaceId } = WorkspaceParams.parse(c.req.param());
    const user = c.get("user");
    await this.requireAdmin(user.id, workspaceId);
    await this.billing.portal(workspaceId, user.id);
    // Without configuration the Polar plugin is absent; fail clearly instead of reaching it.
    if (!this.payments.configured)
      throw new IntegrationUnavailableError("Billing");
    const session = await this.auth.api.portal({
      headers: c.req.raw.headers,
      body: { redirect: false },
    });
    return c.json({ url: session.url }, 200);
  };

  private async requireAdmin(userId: string, workspaceId: string) {
    if (!(await this.memberships.isAdmin(userId, workspaceId)))
      throw billingError(
        "BILLING_FORBIDDEN",
        "Workspace administrator access is required",
      );
  }
}

import type { ServerEnvironment } from "@wodge/env/server";
import type { PaymentSubscription } from "@wodge/infra/payments/types";
import { createPolarCore, type PolarCore } from "@polar-sh/sdk/2026-10";
import { getSubscriptions } from "@polar-sh/sdk/2026-10/services/subscriptions";
import { IntegrationUnavailableError } from "../integration-unavailable";
import { inject, injectable } from "tsyringe";

@injectable()
export class PolarPayments {
  private core?: PolarCore;
  constructor(
    @inject("environment") private readonly environment: ServerEnvironment,
  ) {}

  get configured() {
    return Boolean(this.environment.POLAR_ACCESS_TOKEN);
  }

  get webhooksConfigured() {
    return this.configured && Boolean(this.environment.POLAR_WEBHOOK_SECRET);
  }

  /** The showcase only uses the Polar sandbox; live payments need separate authorization. */
  get client(): PolarCore {
    const accessToken = this.environment.POLAR_ACCESS_TOKEN;
    if (!accessToken) throw new IntegrationUnavailableError("Billing");
    return (this.core ??= createPolarCore({
      accessToken,
      environment: "sandbox",
    }));
  }

  get productId() {
    const productId = this.environment.POLAR_PRODUCT_ID;
    if (!this.configured || !productId)
      throw new IntegrationUnavailableError("Billing product");
    return productId;
  }

  async subscription(id: string): Promise<PaymentSubscription> {
    const subscription = await getSubscriptions(this.client)(id);
    return {
      id: subscription.id,
      created: Date.parse(subscription.created_at),
      modified: Date.parse(subscription.modified_at ?? subscription.created_at),
      status: subscription.status,
      productId: subscription.product_id,
      metadata: subscription.metadata,
      customerExternalId: subscription.customer.external_id ?? null,
    };
  }
}

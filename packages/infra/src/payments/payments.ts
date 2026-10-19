import type { ServerEnvironment } from "@wodge/env/server";
import type { PaymentEvent } from "@wodge/infra/payments/types";
import Stripe from "stripe";
import { IntegrationUnavailableError } from "../integration-unavailable";
import { inject, injectable } from "tsyringe";

@injectable()
export class StripePayments {
  private client?: Stripe;
  constructor(
    @inject("environment") private readonly environment: ServerEnvironment,
  ) {}

  private get stripe(): Stripe {
    const key = this.environment.STRIPE_SECRET_KEY;
    if (!key) throw new IntegrationUnavailableError("Billing");
    return (this.client ??= new Stripe(key));
  }

  listPrices(lookupKey: string | undefined) {
    if (!lookupKey) throw new IntegrationUnavailableError("Billing price");
    return this.stripe.prices.list({
      lookup_keys: [lookupKey],
      expand: ["data.product"],
    });
  }

  createCheckout(params: Stripe.Checkout.SessionCreateParams) {
    return this.stripe.checkout.sessions.create(params);
  }

  createPortal(params: Stripe.BillingPortal.SessionCreateParams) {
    return this.stripe.billingPortal.sessions.create(params);
  }

  async subscription(id: string) {
    const subscription = await this.stripe.subscriptions.retrieve(id);
    return {
      id: subscription.id,
      created: subscription.created,
      status: subscription.status,
      metadata: subscription.metadata,
      customer:
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer.id,
    };
  }

  verifyEvent(body: string, signature: string, secret: string | undefined) {
    if (!secret) throw new IntegrationUnavailableError("Billing webhook");
    return this.stripe.webhooks
      .constructEventAsync(body, signature, secret)
      .then(toPaymentEvent);
  }
}

function toPaymentEvent(event: Stripe.Event): PaymentEvent {
  if (
    event.type !== "customer.subscription.created" &&
    event.type !== "customer.subscription.updated" &&
    event.type !== "customer.subscription.deleted"
  ) {
    return { id: event.id, type: "ignored" };
  }

  const { id, created, status, metadata, customer } = event.data.object;

  return {
    id: event.id,
    created: event.created,
    type: event.type,
    data: {
      object: {
        id,
        created,
        status,
        metadata,
        customer: typeof customer === "string" ? customer : customer?.id,
      },
    },
  };
}

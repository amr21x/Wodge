import type { ServerEnvironment } from "@wodge/env/server";
import type { PaymentEvent } from "@wodge/infra/payments/types";
import Stripe from "stripe";
import { inject, injectable } from "tsyringe";

@injectable()
export class StripePayments {
  private readonly stripe: Stripe;
  constructor(@inject("environment") environment: ServerEnvironment) {
    this.stripe = new Stripe(environment.STRIPE_SECRET_KEY);
  }

  listPrices(lookupKey: string) {
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

  verifyEvent(body: string, signature: string, secret: string) {
    return this.stripe.webhooks
      .constructEventAsync(body, signature, secret)
      .then(toPaymentEvent);
  }
}

function toPaymentEvent(event: Stripe.Event): PaymentEvent {
  if (
    event.type !== "customer.subscription.created" &&
    event.type !== "customer.subscription.deleted"
  ) {
    return { id: event.id, type: "ignored" };
  }

  const { metadata, customer } = event.data.object;

  return {
    id: event.id,
    type: event.type,
    data: {
      object: {
        metadata,
        customer: typeof customer === "string" ? customer : customer?.id,
      },
    },
  };
}

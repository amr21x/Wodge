import type { SubscriptionStatus } from "@wodge/domain/billing/dto";

/** Provider-neutral subscription snapshot read back from the payment provider. */
export type PaymentSubscription = {
  id: string;
  /** Epoch milliseconds. */
  created: number;
  /** Epoch milliseconds of the provider's last change to this subscription. */
  modified: number;
  status: SubscriptionStatus;
  productId: string;
  metadata: Record<string, unknown>;
  /** The application identity of the paying customer, when linked. */
  customerExternalId: string | null;
};

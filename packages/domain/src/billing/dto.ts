import type { z } from "zod";
import type { SubscriptionEventSchema } from "./validation";
import type { ApplicationFailure } from "../errors";
import type { BillingErrorCode } from "./errors";

export type BillingResult =
  | { url: string | null }
  | { error: ApplicationFailure<BillingErrorCode> };

export type SubscriptionEvent = z.infer<typeof SubscriptionEventSchema>;

export type SubscriptionStatus = SubscriptionEvent["status"];

export type SubscriptionState = Omit<SubscriptionEvent, "status"> & {
  changeId: string;
  isPremium: boolean;
  ended: boolean;
};

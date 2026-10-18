import { z } from "zod";

export const SubscriptionEventSchema = z
  .object({
    workspaceId: z.string().min(1).max(256),
    eventId: z.string().min(1).max(256),
    eventCreated: z.number().int().nonnegative(),
    subscriptionId: z.string().min(1).max(256),
    subscriptionCreated: z.number().int().nonnegative(),
    customerId: z.string().min(1).max(256),
    status: z.enum([
      "active",
      "trialing",
      "past_due",
      "unpaid",
      "incomplete",
      "incomplete_expired",
      "canceled",
      "paused",
    ]),
  })
  .strict();

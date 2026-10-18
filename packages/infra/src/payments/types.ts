export type PaymentEvent =
  | {
      id?: string;
      type: "customer.subscription.created" | "customer.subscription.deleted";
      data: {
        object: { metadata: Record<string, string>; customer?: string | null };
      };
    }
  | { id?: string; type: "ignored" };

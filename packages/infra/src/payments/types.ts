export type PaymentEvent =
  | {
      id: string;
      created: number;
      type:
        | "customer.subscription.created"
        | "customer.subscription.updated"
        | "customer.subscription.deleted";
      data: {
        object: {
          id: string;
          created: number;
          status: string;
          metadata: Record<string, string>;
          customer?: string | null;
        };
      };
    }
  | { id?: string; type: "ignored" };

import { BillingService } from "@wodge/core/billing/services/billing";
import { ApplicationError } from "@wodge/core/errors";
import { SubscriptionEventSchema } from "@wodge/domain/billing/validation";
import { PolarPayments } from "@wodge/infra/payments/polar";
import { inject, injectable } from "tsyringe";
import { WorkspaceGateway } from "../gateways/workspace";

/**
 * Reconciles verified Polar subscription webhooks. Better Auth's Polar plugin verifies the
 * signature; this handler trusts nothing in the payload except which subscription to re-read.
 */
@injectable()
export class BillingWebhookHandlers {
  constructor(
    @inject(BillingService) private readonly billing: BillingService,
    @inject(PolarPayments) private readonly payments: PolarPayments,
    @inject(WorkspaceGateway) private readonly workspaces: WorkspaceGateway,
  ) {}

  subscriptionChanged = async (payload: {
    id: string;
    metadata: Record<string, unknown>;
  }) => {
    const workspaceId = payload.metadata.referenceId;
    // Subscriptions without a workspace reference were not created by the workspace billing API.
    if (typeof workspaceId !== "string") return;
    // Capture the database version before reading Polar. A later delivery cannot be overwritten
    // by a snapshot fetched before it; contention retries the entire read/apply operation.
    let previous;
    try {
      previous = await this.billing.subscriptionState(workspaceId);
    } catch (error) {
      // A deleted workspace has no entitlement left to reconcile; acknowledge the delivery.
      if (
        error instanceof ApplicationError &&
        error.code === "BILLING_WORKSPACE_NOT_FOUND"
      )
        return;
      throw error;
    }
    const current = await this.payments.subscription(payload.id);
    if (
      current.productId !== this.payments.productId ||
      current.metadata.referenceId !== workspaceId
    )
      return;
    // Redelivered events re-read the same provider state, so their key is idempotent.
    const snapshot = SubscriptionEventSchema.parse({
      workspaceId,
      eventId: `${current.id}@${current.modified}`,
      eventCreated: current.modified,
      subscriptionId: current.id,
      subscriptionCreated: current.created,
      customerId: current.customerExternalId,
      status: current.status,
    });
    await this.billing.applySubscription(snapshot, previous);
    // Duplicate deliveries retry this idempotent notification if an earlier object call failed.
    await this.workspaces.notify(workspaceId);
  };
}

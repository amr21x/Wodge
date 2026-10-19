import { billingError } from "@wodge/core/billing/errors";
import { WorkspaceRepository } from "@wodge/core/workspace/repositories/directory";
import { createEntityId } from "@wodge/domain/identifiers";
import type {
  SubscriptionEvent,
  SubscriptionState,
} from "@wodge/domain/billing/dto";
import { SubscriptionRepository } from "../repositories/subscriptions";
import { inject, injectable } from "tsyringe";

/** Billing eligibility and local subscription state. Handlers coordinate payment-provider calls. */
@injectable()
export class BillingService {
  constructor(
    @inject(WorkspaceRepository)
    private readonly workspaces: Pick<WorkspaceRepository, "getWorkspaceById">,
    @inject(SubscriptionRepository)
    private readonly subscriptions: Pick<
      SubscriptionRepository,
      "get" | "commit"
    >,
  ) {}

  async checkout(workspaceId: string) {
    const workspace = await this.requireWorkspace(workspaceId);
    if (workspace.isPremium)
      throw billingError("BILLING_ALREADY_PREMIUM", "Already premium");
    return workspace;
  }
  async portal(workspaceId: string) {
    const workspace = await this.requireWorkspace(workspaceId);
    if (!workspace.isPremium || !workspace.customerId)
      throw billingError("BILLING_NOT_PREMIUM", "Not premium");
    return { ...workspace, customerId: workspace.customerId };
  }
  async subscriptionState(workspaceId: string) {
    await this.requireWorkspace(workspaceId);
    return this.subscriptions.get(workspaceId);
  }

  async applySubscription(
    event: SubscriptionEvent,
    previous: SubscriptionState | undefined,
  ) {
    const { status, ...identity } = event;
    const isPremium = status === "active" || status === "trialing";
    const ended = status === "canceled" || status === "incomplete_expired";
    if (previous) {
      if (previous.subscriptionId !== event.subscriptionId) {
        if (event.subscriptionCreated < previous.subscriptionCreated) return;
        if (event.subscriptionCreated === previous.subscriptionCreated)
          throw billingError(
            "BILLING_EVENT_CONFLICT",
            "Subscription replacement needs reconciliation",
          );
      } else {
        if (previous.ended && !ended)
          throw billingError(
            "BILLING_EVENT_CONFLICT",
            "Canceled subscription cannot be restored",
          );
      }
    }
    const changed = await this.subscriptions.commit(
      { ...identity, isPremium, ended, changeId: createEntityId() },
      previous?.changeId,
      {
        isPremium,
        customerId: isPremium ? event.customerId : null,
      },
    );
    // Retry the complete delivery, including a fresh provider read, after a concurrent change.
    if (!changed)
      throw billingError(
        "BILLING_EVENT_CONFLICT",
        "Subscription state changed; retry delivery",
      );
  }
  private async requireWorkspace(workspaceId: string) {
    const workspace = await this.workspaces.getWorkspaceById(workspaceId);
    if (!workspace)
      throw billingError("BILLING_WORKSPACE_NOT_FOUND", "Workspace not found");
    return workspace;
  }
}

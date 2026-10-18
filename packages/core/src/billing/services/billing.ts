import { billingError } from "@wodge/core/billing/errors";
import { WorkspaceRepository } from "@wodge/core/workspace/repositories/directory";
import { inject, injectable } from "tsyringe";

/** Billing eligibility and local subscription state. Handlers coordinate payment-provider calls. */
@injectable()
export class BillingService {
  constructor(
    @inject(WorkspaceRepository)
    private readonly workspaces: Pick<
      WorkspaceRepository,
      "getWorkspaceById" | "setBilling"
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
  setSubscription(
    workspaceId: string,
    isPremium: boolean,
    customerId: string | null,
  ) {
    return this.workspaces.setBilling(workspaceId, { isPremium, customerId });
  }
  private async requireWorkspace(workspaceId: string) {
    const workspace = await this.workspaces.getWorkspaceById(workspaceId);
    if (!workspace)
      throw billingError("BILLING_WORKSPACE_NOT_FOUND", "Workspace not found");
    return workspace;
  }
}

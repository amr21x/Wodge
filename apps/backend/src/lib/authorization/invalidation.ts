import { AuthorizationPolicies } from "@wodge/auth/authorization/policies";
import { WorkspaceLifecycle } from "@wodge/core/workspace/services/lifecycle";
import { AuthorizationRetry } from "@wodge/infra/durable-objects/authorization-retry";
import { inject, injectable } from "tsyringe";
import { RoomGateway } from "../../gateways/room";

@injectable()
export class AuthorizationInvalidations {
  constructor(
    @inject(AuthorizationPolicies)
    private readonly policies: Pick<
      AuthorizationPolicies,
      "pendingInvalidations" | "acknowledgeInvalidation" | "markChanged"
    >,
    @inject(RoomGateway)
    private readonly gateway: Pick<RoomGateway, "invalidateAuthorization">,
    @inject(AuthorizationRetry)
    private readonly retry: Pick<AuthorizationRetry, "schedule">,
    @inject(WorkspaceLifecycle)
    private readonly workspace: Pick<WorkspaceLifecycle, "roomScopes">,
  ) {}

  async flush() {
    for (const event of await this.policies.pendingInvalidations()) {
      try {
        await Promise.all(
          this.workspace
            .roomScopes()
            .map((scope) =>
              this.gateway.invalidateAuthorization(
                scope.roomId,
                event.revision,
              ),
            ),
        );
        // Delivery may be repeated; acknowledgement follows successful fan-out only.
        await this.policies.acknowledgeInvalidation(event.id);
      } catch (error) {
        console.error("Authorization invalidation pending retry", error);
        await this.retry.schedule();
        return;
      }
    }
  }
  async policyChanged() {
    await this.policies.markChanged();
    await this.flush();
  }
}

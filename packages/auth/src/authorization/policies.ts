import { authorizationError } from "@wodge/core/authorization/errors";
import { AuthorizationRepository } from "@wodge/core/authorization/repositories/policy";
import type { AuthorizationPolicy } from "@wodge/domain/authorization/models";
import { createEntityId } from "@wodge/domain/identifiers";
import { inject, injectable } from "tsyringe";

/** Policy changes and their invalidation intent are persisted together in the workspace. */
@injectable()
export class AuthorizationPolicies {
  constructor(
    @inject(AuthorizationRepository)
    private readonly repository: AuthorizationRepository,
  ) {}
  read() {
    return this.repository.read();
  }
  pendingInvalidations() {
    return this.repository.pendingInvalidations();
  }
  acknowledgeInvalidation(id: string) {
    return this.repository.acknowledgeInvalidation(id);
  }
  commit(expectedRevision: number, policy: AuthorizationPolicy) {
    return this.repository.commit(expectedRevision, policy, {
      id: createEntityId(),
      workspaceId: policy.workspaceId,
      revision: policy.revision,
      createdAt: Date.now(),
    });
  }
  async markChanged() {
    for (let attempt = 0; attempt < 3; attempt++) {
      const policy = await this.read();
      if (!policy) return;
      try {
        await this.commit(policy.revision, {
          ...policy,
          revision: policy.revision + 1,
        });
        return;
      } catch (error) {
        if (
          !(error instanceof Error) ||
          !("code" in error) ||
          error.code !== "AUTHORIZATION_CONFLICT"
        )
          throw error;
      }
    }
    throw authorizationError(
      "AUTHORIZATION_CONFLICT",
      "Authorization changed; retry the operation",
    );
  }
}

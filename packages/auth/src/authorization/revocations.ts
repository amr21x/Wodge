import { inject, injectable } from "tsyringe";
import { AuthorizationPolicies } from "./policies";

/** Remove assignments when Better Auth removes the corresponding organization membership. */
@injectable()
export class AuthorizationRevocations {
  constructor(
    @inject(AuthorizationPolicies)
    private readonly policies: Pick<AuthorizationPolicies, "read" | "commit">,
  ) {}

  async revokeUserAssignments(userId: string) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const policy = await this.policies.read();
      if (!policy) return;
      try {
        await this.policies.commit(policy.revision, {
          ...policy,
          revision: policy.revision + 1,
          assignments: policy.assignments.filter(
            (assignment) =>
              assignment.subject.type !== "user" ||
              assignment.subject.id !== userId,
          ),
        });
        return;
      } catch (error) {
        if (
          attempt === 2 ||
          !(error instanceof Error) ||
          !("code" in error) ||
          error.code !== "AUTHORIZATION_CONFLICT"
        )
          throw error;
      }
    }
  }
}

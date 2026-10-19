import { AuthorizationPolicies } from "@wodge/auth/authorization/policies";
import { WorkspaceMutationAccess } from "@wodge/auth/authorization/workspace-mutations";
import { WorkspaceService } from "@wodge/core/workspace/services/structure";
import { inject, injectable } from "tsyringe";
import { UserGateway } from "../../gateways/user";
import type WorkspaceServer from "../../servers/workspace";
import type { RequestActor } from "../../types/actor";
import { dispatchWorkspaceMutation } from "./mutations/workspace";
import { createWorkspacePatch } from "./patches/workspace";
import type { RunnerParams } from "./replicache";

import { WorkspaceNotifications } from "../../gateways/workspace-notifications";
@injectable()
export class WorkspaceSync {
  constructor(
    @inject(WorkspaceMutationAccess)
    private readonly access: WorkspaceMutationAccess,
    @inject("workspace") private readonly party: WorkspaceServer,
    @inject(WorkspaceService) private readonly service: WorkspaceService,
    @inject(AuthorizationPolicies)
    private readonly policies: AuthorizationPolicies,
    @inject(WorkspaceNotifications)
    private readonly notifications: WorkspaceNotifications,
    @inject(UserGateway) private readonly userGateway: UserGateway,
  ) {}
  get storage() {
    return this.party.ctx.storage;
  }
  get versions() {
    return this.party.versions;
  }
  async run(params: RunnerParams, actor: RequestActor) {
    let authorized: RequestActor;
    try {
      authorized = {
        ...actor,
        ...this.access.authorize(
          params.mutation.name,
          params.mutation.args,
          actor,
        ),
      };
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        error.code === "WORKSPACE_FORBIDDEN"
      )
        return;
      throw error;
    }
    await dispatchWorkspaceMutation(this.service, params, authorized);
    await this.policies.markChanged();
  }
  patch = (userId: string) =>
    createWorkspacePatch(this.party, userId, this.userGateway);
  notify = () => this.notifications.notify();
}

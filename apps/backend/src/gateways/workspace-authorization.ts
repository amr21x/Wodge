import { GrantAuthority } from "@wodge/auth/authorization/authority";
import { authorizationError } from "@wodge/core/authorization/errors";
import type {
  AuthorizationPrincipal,
  ResourceGrant,
  RoomAuthorizationScope,
} from "@wodge/domain/authorization/models";
import { ResourceGrantSchema } from "@wodge/domain/authorization/validation";
import { HttpClient } from "@wodge/infra/http/client";
import { getServerByName } from "partyserver";
import { inject, injectable } from "tsyringe";
import type { WorkerEnvironment } from "../types/worker-environment";

@injectable()
export class WorkspaceAuthorizationGateway implements GrantAuthority {
  constructor(
    @inject(HttpClient) private readonly http: HttpClient,
    @inject("environment") private readonly bindings: WorkerEnvironment,
  ) {}

  async resolve(
    scope: RoomAuthorizationScope,
    principal: AuthorizationPrincipal,
  ): Promise<ResourceGrant> {
    const workspace = await getServerByName(
      this.bindings.Workspace,
      scope.workspaceId,
    );
    const response = await this.http.request(
      `https://internal/parties/workspace/${encodeURIComponent(scope.workspaceId)}/service/authorization/grant`,
      {
        method: "POST",
        headers: {
          authorization: this.bindings.SECRET_KEY,
          "content-type": "application/json",
          "x-user-id": principal.userId,
          "x-session-id": principal.sessionId,
        },
        body: JSON.stringify(scope),
      },
      (request) => workspace.fetch(request),
    );
    if (response.status === 403 || response.status === 404) {
      throw authorizationError(
        "AUTHORIZATION_FORBIDDEN",
        "Resource access denied",
      );
    }
    // An unavailable authority is retryable; it is distinct from an explicit access denial.
    if (!response.ok) {
      throw authorizationError(
        "AUTHORIZATION_UNAVAILABLE",
        "Authorization is temporarily unavailable",
      );
    }
    try {
      return ResourceGrantSchema.parse(await response.json());
    } catch {
      throw authorizationError(
        "AUTHORIZATION_UNAVAILABLE",
        "Authorization authority returned an invalid response",
      );
    }
  }
}

import { authorizationError } from "@wodge/core/authorization/errors";
import type {
  AuthorizationInvalidation,
  AuthorizationPolicy,
} from "@wodge/domain/authorization/models";
import type { RecordStorage } from "@wodge/infra/durable-objects/storage";
import { inject, injectable } from "tsyringe";

interface StoredAuthorization {
  policy: AuthorizationPolicy;
  outbox: AuthorizationInvalidation[];
}

const key = "authorization:policy:v1";

@injectable()
export class AuthorizationRepository {
  constructor(
    @inject("storage")
    private readonly storage: Pick<RecordStorage, "get" | "put">,
    @inject("objectId") private readonly workspaceId: string,
  ) {}

  async read() {
    return (await this.storage.get<StoredAuthorization>(key))?.policy ?? null;
  }

  async commit(
    expectedRevision: number,
    policy: AuthorizationPolicy,
    invalidation: AuthorizationInvalidation,
  ) {
    const current = await this.storage.get<StoredAuthorization>(key);
    if ((current?.policy.revision ?? 0) !== expectedRevision) {
      throw authorizationError(
        "AUTHORIZATION_CONFLICT",
        "Authorization changed; retry with current policy",
      );
    }
    if (
      policy.workspaceId !== this.workspaceId ||
      policy.revision !== expectedRevision + 1
    ) {
      throw authorizationError(
        "AUTHORIZATION_INVALID_INPUT",
        "Invalid policy revision or workspace",
      );
    }
    // No intervening I/O between the guarded read and this single atomic write.
    await this.storage.put(key, {
      policy,
      outbox: [...(current?.outbox ?? []), invalidation],
    } satisfies StoredAuthorization);
  }

  async pendingInvalidations() {
    return (await this.storage.get<StoredAuthorization>(key))?.outbox ?? [];
  }

  async acknowledgeInvalidation(id: string) {
    const current = await this.storage.get<StoredAuthorization>(key);
    if (current) {
      await this.storage.put(key, {
        ...current,
        outbox: current.outbox.filter((event) => event.id !== id),
      });
    }
  }
}

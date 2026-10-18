import { RoomScope } from "@wodge/auth/authorization/room-scope";
import { authorizationError } from "@wodge/core/authorization/errors";
import type {
  AuthorizationPrincipal,
  ResourceGrant,
  RoomAuthorizationScope,
} from "@wodge/domain/authorization/models";
import { inject, injectable } from "tsyringe";
import { GrantAuthority } from "./authority";

interface RoomScopeStore {
  loadRoomScope(): Promise<RoomAuthorizationScope | undefined>;
  bindRoomScope(scope: RoomAuthorizationScope): Promise<void>;
}

interface GrantCacheState {
  grants: Map<string, ResourceGrant>;
  pending: Map<string, Promise<ResourceGrant>>;
  minimumRevision: number;
}

@injectable()
export class ResourceGrantCache {
  private readonly state: GrantCacheState = {
    grants: new Map(),
    pending: new Map(),
    minimumRevision: 0,
  };
  constructor(
    @inject(GrantAuthority)
    private readonly gateway: GrantAuthority,
    @inject(RoomScope)
    private readonly persistence: RoomScopeStore,
    @inject("objectId") private readonly roomId: string,
  ) {}

  async bind(scope: RoomAuthorizationScope) {
    if (scope.roomId !== this.roomId) {
      throw authorizationError(
        "AUTHORIZATION_INVALID_INPUT",
        "Room scope does not match this object",
      );
    }
    await this.persistence.bindRoomScope(scope);
  }

  async invalidate(workspaceId: string, revision: number) {
    const scope = await this.persistence.loadRoomScope();
    if (scope?.workspaceId !== workspaceId) {
      throw authorizationError(
        "AUTHORIZATION_FORBIDDEN",
        "Invalidation belongs to a different workspace",
      );
    }
    this.state.minimumRevision = Math.max(this.state.minimumRevision, revision);
    for (const [key, grant] of this.state.grants) {
      if (grant.policyRevision < this.state.minimumRevision) {
        this.state.grants.delete(key);
      }
    }
  }

  async get(principal: AuthorizationPrincipal): Promise<ResourceGrant> {
    // Session is part of the key so one login cannot reuse another login's grant.
    const key = JSON.stringify([principal.userId, principal.sessionId]);
    const existing = this.state.grants.get(key);
    if (
      existing &&
      existing.expiresAt > Date.now() &&
      existing.policyRevision >= this.state.minimumRevision
    ) {
      return existing;
    }
    // Concurrent requests for the same principal share one authority lookup.
    const pending = this.state.pending.get(key);
    if (pending) {
      return pending;
    }
    const refresh = this.refresh(principal, key);
    this.state.pending.set(key, refresh);
    try {
      return await refresh;
    } finally {
      this.state.pending.delete(key);
    }
  }

  private async refresh(principal: AuthorizationPrincipal, key: string) {
    const scope = await this.persistence.loadRoomScope();
    if (!scope) {
      throw authorizationError(
        "AUTHORIZATION_UNAVAILABLE",
        "Room authorization scope has not been provisioned",
      );
    }
    const grant = await this.gateway.resolve(scope, principal);
    // Recheck the revision after the RPC: an invalidation may have arrived while it was in flight.
    if (
      grant.principal.userId !== principal.userId ||
      grant.principal.sessionId !== principal.sessionId ||
      grant.workspaceId !== scope.workspaceId ||
      grant.scope.type !== "room" ||
      grant.scope.id !== this.roomId ||
      grant.expiresAt <= Date.now() ||
      grant.expiresAt > grant.issuedAt + 30_000 ||
      grant.policyRevision < this.state.minimumRevision
    ) {
      throw authorizationError(
        "AUTHORIZATION_UNAVAILABLE",
        "Authorization grant is invalid or stale",
      );
    }
    if (this.state.grants.size >= 256) {
      this.state.grants.delete(this.state.grants.keys().next().value!);
    }
    this.state.grants.set(key, grant);
    return grant;
  }
}

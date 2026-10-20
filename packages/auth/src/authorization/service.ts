import { WorkspaceRecordRepository } from "@wodge/core/workspace/repositories/records";
import { OrganizationMembership } from "@wodge/auth/authorization/membership";
import {
  assertApplicablePermissions,
  containsPermissions,
  effectivePermissions,
  initialPolicy,
  migrateResourcePolicy,
  extendResourceAssignments,
  reconcileOrganizationRoles,
  scopeAncestry,
} from "@wodge/auth/authorization/policy";
import { authorizationError } from "@wodge/core/authorization/errors";
import { WorkspaceLifecycleRepository } from "@wodge/core/workspace/repositories/lifecycle";
import type {
  AssignRoleInput,
  CreateRoleInput,
  UpdateRoleInput,
} from "@wodge/domain/authorization/dto";
import type {
  AuthorizationPolicy,
  AuthorizationPrincipal,
  PermissionRequest,
  PermissionResult,
  ResourceGrant,
  RoomAuthorizationScope,
} from "@wodge/domain/authorization/models";
import { createEntityId } from "@wodge/domain/identifiers";
import type {
  WorkspaceState,
  WorkspaceStructure,
} from "@wodge/domain/workspace/models";
import { inject, injectable } from "tsyringe";
import { AuthorizationPolicies } from "./policies";

@injectable()
export class WorkspaceAuthorization {
  constructor(
    @inject(AuthorizationPolicies)
    private readonly repository: Pick<AuthorizationPolicies, "read" | "commit">,
    @inject(OrganizationMembership)
    private readonly memberships: OrganizationMembership,
    @inject(WorkspaceLifecycleRepository)
    private readonly state: WorkspaceState,
    @inject("objectId") private readonly workspaceId: string,
    @inject(WorkspaceRecordRepository) private readonly records: Pick<
      WorkspaceRecordRepository,
      "loadPermissionImports" | "finishPermissionImport"
    >,
  ) {}

  /** Trusted lifecycle operation; callers supply the refreshed organization projection. */
  async synchronizeOrganizationRoles() {
    for (let attempt = 0; attempt < 3; attempt++) {
      const policy = await this.repository.read();
      if (!policy) {
        return;
      }
      try {
        await this.repository.commit(
          policy.revision,
          reconcileOrganizationRoles(policy, this.state),
        );
        return;
      } catch (error) {
        if (
          !(error instanceof Error) ||
          !("code" in error) ||
          error.code !== "AUTHORIZATION_CONFLICT" ||
          attempt === 2
        ) {
          throw error;
        }
      }
    }
  }

  private async requireMember(principal: AuthorizationPrincipal) {
    const membership = await this.memberships.validate(
      principal,
      this.workspaceId,
    );
    if (!membership || membership.expiresAt <= Date.now()) {
      throw authorizationError(
        "AUTHORIZATION_FORBIDDEN",
        "Active organization membership is required",
      );
    }
    return membership;
  }

  private async policy() {
    const stored = await this.repository.read();
    if (stored) {
      const imports = await this.records.loadPermissionImports();
      if (!stored.resourcesMigrated) {
        const upgraded = migrateResourcePolicy(
          stored,
          this.state,
          imports ?? [],
        );
        await this.repository.commit(stored.revision, upgraded);
        await this.records.finishPermissionImport();
        return upgraded;
      }
      if (imports !== null) await this.records.finishPermissionImport();
      return stored;
    }
    if (!this.state.members.createdBy) {
      throw authorizationError(
        "AUTHORIZATION_NOT_FOUND",
        "Workspace has not been initialized",
      );
    }
    const policy = initialPolicy(
      this.workspaceId,
      this.state,
      await this.records.loadPermissionImports(),
    );
    try {
      await this.repository.commit(0, policy);
      await this.records.finishPermissionImport();
      return policy;
    } catch (error) {
      const winner = await this.repository.read();
      if (winner) {
        return winner;
      }
      throw error;
    }
  }

  private requireAllowed(
    policy: AuthorizationPolicy,
    request: PermissionRequest,
    principal: AuthorizationPrincipal,
  ) {
    assertApplicablePermissions(request.scope, request.permissions);
    if (!scopeAncestry(this.workspaceId, this.state, request.scope).length) {
      throw authorizationError(
        "AUTHORIZATION_NOT_FOUND",
        "Resource is outside this workspace",
      );
    }
    const allowed = effectivePermissions(
      policy,
      this.state,
      principal.userId,
      request.scope,
    );
    if (!containsPermissions(allowed, request.permissions)) {
      throw authorizationError("AUTHORIZATION_FORBIDDEN", "Permission denied");
    }
  }

  private workspaceRequest(
    permissions: PermissionRequest["permissions"],
  ): PermissionRequest {
    return { scope: { type: "workspace", id: this.workspaceId }, permissions };
  }

  /** Internal object calls carry verified user identity; organization membership remains authoritative. */
  async permissionsForUser(userId: string, scope: PermissionRequest["scope"]) {
    if (!(await this.memberships.hasMember(userId, this.workspaceId)))
      return {};
    return effectivePermissions(await this.policy(), this.state, userId, scope);
  }

  async pageMembers(pageId: string, principal: AuthorizationPrincipal) {
    await this.requireMember(principal);
    const policy = await this.policy();
    const scope = { type: "page" as const, id: pageId };
    this.requireAllowed(
      policy,
      { scope, permissions: { page: ["read"] } },
      principal,
    );
    const eligible = this.state.members.members.filter((member) =>
      containsPermissions(
        effectivePermissions(policy, this.state, member.id, scope),
        { page: ["read"] },
      ),
    );
    const active = await Promise.all(
      eligible.map(async (member) =>
        (await this.memberships.hasMember(member.id, this.workspaceId))
          ? member.id
          : null,
      ),
    );
    return active.filter((id): id is string => id !== null);
  }

  async provisionResources(previous: WorkspaceStructure) {
    const before = new Set(
      previous.teams.flatMap((team) =>
        [
          ...team.rooms,
          ...team.threads,
          ...team.folders.flatMap((f) => f.channels),
        ].map((resource) => resource.id),
      ),
    );
    const added = new Set(
      this.state.structure.teams
        .flatMap((team) =>
          [
            ...team.rooms,
            ...team.threads,
            ...team.folders.flatMap((f) => f.channels),
          ].map((resource) => resource.id),
        )
        .filter((id) => !before.has(id)),
    );
    if (!added.size) return;
    const policy = await this.policy();
    const seed = initialPolicy(this.workspaceId, this.state);
    const assignments = seed.assignments.filter(
      (a) =>
        added.has(a.scope.id) &&
        !policy.assignments.some(
          (existing) =>
            existing.scope.type === a.scope.type &&
            existing.scope.id === a.scope.id,
        ),
    );
    if (!assignments.length) return;
    await this.repository.commit(
      policy.revision,
      extendResourceAssignments(policy, seed, assignments),
    );
  }

  async hasPermission(
    request: PermissionRequest,
    principal: AuthorizationPrincipal,
  ): Promise<PermissionResult> {
    await this.requireMember(principal);
    const policy = await this.policy();
    assertApplicablePermissions(request.scope, request.permissions);
    const allowed = effectivePermissions(
      policy,
      this.state,
      principal.userId,
      request.scope,
    );
    return containsPermissions(allowed, request.permissions)
      ? { success: true }
      : { success: false, code: "AUTHORIZATION_FORBIDDEN" };
  }

  async requirePermission(
    request: PermissionRequest,
    principal: AuthorizationPrincipal,
  ): Promise<void> {
    await this.requireMember(principal);
    this.requireAllowed(await this.policy(), request, principal);
  }

  async listRoles(principal: AuthorizationPrincipal) {
    await this.requireMember(principal);
    const policy = await this.policy();
    this.requireAllowed(
      policy,
      this.workspaceRequest({ role: ["read"] }),
      principal,
    );
    return {
      revision: policy.revision,
      roles: policy.roles,
      assignments: policy.assignments,
    };
  }

  async createRole(input: CreateRoleInput, principal: AuthorizationPrincipal) {
    await this.requireMember(principal);
    const policy = await this.policy();
    this.requireAllowed(
      policy,
      this.workspaceRequest({ role: ["create"] }),
      principal,
    );
    this.requireAllowed(
      policy,
      this.workspaceRequest(input.permissions),
      principal,
    );
    if (
      policy.roles.some(
        (role) => role.name.toLowerCase() === input.name.toLowerCase(),
      )
    ) {
      throw authorizationError(
        "AUTHORIZATION_CONFLICT",
        "Role name is already in use",
      );
    }
    const role = {
      id: createEntityId(),
      name: input.name,
      permissions: structuredClone(input.permissions),
    };
    await this.commit(policy, { ...policy, roles: [...policy.roles, role] });
    return role;
  }

  async updateRole(input: UpdateRoleInput, principal: AuthorizationPrincipal) {
    await this.requireMember(principal);
    const policy = await this.policy();
    this.requireAllowed(
      policy,
      this.workspaceRequest({ role: ["update"] }),
      principal,
    );
    this.requireAllowed(
      policy,
      this.workspaceRequest(input.permissions),
      principal,
    );
    const previous = policy.roles.find((role) => role.id === input.roleId);
    if (!previous) {
      throw authorizationError("AUTHORIZATION_NOT_FOUND", "Role not found");
    }
    if (previous.system) {
      throw authorizationError(
        "AUTHORIZATION_FORBIDDEN",
        "System roles cannot be edited",
      );
    }
    if (
      policy.roles.some(
        (role) =>
          role.id !== input.roleId &&
          role.name.toLowerCase() === input.name.toLowerCase(),
      )
    ) {
      throw authorizationError(
        "AUTHORIZATION_CONFLICT",
        "Role name is already in use",
      );
    }
    const role = {
      id: previous.id,
      name: input.name,
      permissions: structuredClone(input.permissions),
    };
    await this.commit(policy, {
      ...policy,
      roles: policy.roles.map((item) => (item.id === role.id ? role : item)),
    });
    return role;
  }

  async deleteRole(
    input: { roleId: string },
    principal: AuthorizationPrincipal,
  ) {
    await this.requireMember(principal);
    const policy = await this.policy();
    this.requireAllowed(
      policy,
      this.workspaceRequest({ role: ["delete"] }),
      principal,
    );
    const role = policy.roles.find((item) => item.id === input.roleId);
    if (!role) {
      throw authorizationError("AUTHORIZATION_NOT_FOUND", "Role not found");
    }
    if (role.system) {
      throw authorizationError(
        "AUTHORIZATION_FORBIDDEN",
        "System roles cannot be deleted",
      );
    }
    if (
      policy.assignments.some((assignment) => assignment.roleId === role.id)
    ) {
      throw authorizationError(
        "AUTHORIZATION_CONFLICT",
        "Remove role assignments before deleting the role",
      );
    }
    await this.commit(policy, {
      ...policy,
      roles: policy.roles.filter((item) => item.id !== role.id),
    });
  }

  async assignRole(input: AssignRoleInput, principal: AuthorizationPrincipal) {
    await this.requireMember(principal);
    if (
      input.subject.type === "user" &&
      !(await this.memberships.hasMember(input.subject.id, this.workspaceId))
    ) {
      throw authorizationError(
        "AUTHORIZATION_NOT_FOUND",
        "Role subject is not an organization member",
      );
    }
    if (
      input.subject.type === "team" &&
      !this.state.structure.teams.some((team) => team.id === input.subject.id)
    ) {
      throw authorizationError(
        "AUTHORIZATION_NOT_FOUND",
        "Role subject team does not exist",
      );
    }
    const policy = await this.policy();
    this.requireAllowed(
      policy,
      {
        scope: input.scope,
        permissions: { role: ["assign"] },
      },
      principal,
    );
    const role = policy.roles.find((item) => item.id === input.roleId);
    if (!role) {
      throw authorizationError("AUTHORIZATION_NOT_FOUND", "Role not found");
    }
    if (role.system) {
      throw authorizationError(
        "AUTHORIZATION_FORBIDDEN",
        "System roles cannot be assigned through custom role APIs",
      );
    }
    assertApplicablePermissions(input.scope, role.permissions);
    // Check grantable actions at the scope, allowing role administration on a concrete resource.
    const allowed = effectivePermissions(
      policy,
      this.state,
      principal.userId,
      input.scope,
    );
    if (!containsPermissions(allowed, role.permissions)) {
      throw authorizationError(
        "AUTHORIZATION_FORBIDDEN",
        "Cannot assign permissions beyond your own scope",
      );
    }
    const existing = policy.assignments.find(
      (assignment) =>
        assignment.roleId === input.roleId &&
        assignment.subject.type === input.subject.type &&
        assignment.subject.id === input.subject.id &&
        assignment.scope.type === input.scope.type &&
        assignment.scope.id === input.scope.id,
    );
    if (existing) {
      return existing;
    }
    const assignment = { id: createEntityId(), ...structuredClone(input) };
    await this.commit(policy, {
      ...policy,
      assignments: [...policy.assignments, assignment],
    });
    return assignment;
  }

  async removeRole(
    input: { assignmentId: string },
    principal: AuthorizationPrincipal,
  ) {
    await this.requireMember(principal);
    const policy = await this.policy();
    const assignment = policy.assignments.find(
      (item) => item.id === input.assignmentId,
    );
    if (!assignment) {
      throw authorizationError(
        "AUTHORIZATION_NOT_FOUND",
        "Role assignment not found",
      );
    }
    this.requireAllowed(
      policy,
      {
        scope: assignment.scope,
        permissions: { role: ["assign"] },
      },
      principal,
    );
    if (
      policy.roles.find((role) => role.id === assignment.roleId)?.system ===
      "owner"
    ) {
      throw authorizationError(
        "AUTHORIZATION_FORBIDDEN",
        "The workspace owner assignment is protected",
      );
    }
    await this.commit(policy, {
      ...policy,
      assignments: policy.assignments.filter(
        (item) => item.id !== assignment.id,
      ),
    });
  }

  async resolveRoomGrant(
    scope: RoomAuthorizationScope,
    principal: AuthorizationPrincipal,
  ) {
    if (scope.workspaceId !== this.workspaceId)
      throw authorizationError(
        "AUTHORIZATION_FORBIDDEN",
        "Workspace scope mismatch",
      );
    const team = this.state.structure.teams.find(
      (item) => item.id === scope.teamId,
    );
    if (!team?.rooms.some((room) => room.id === scope.roomId))
      throw authorizationError(
        "AUTHORIZATION_FORBIDDEN",
        "Room team scope mismatch",
      );
    return this.resolveGrant({ type: "room", id: scope.roomId }, principal);
  }

  async resolveGrant(
    scope: PermissionRequest["scope"],
    principal: AuthorizationPrincipal,
  ): Promise<ResourceGrant> {
    const checkedAt = Date.now();
    const membership = await this.requireMember(principal);
    const policy = await this.policy();
    if (!scopeAncestry(this.workspaceId, this.state, scope).length) {
      throw authorizationError(
        "AUTHORIZATION_NOT_FOUND",
        "Resource is outside this workspace",
      );
    }
    return {
      principal: { ...principal },
      workspaceId: this.workspaceId,
      scope,
      permissions: effectivePermissions(
        policy,
        this.state,
        principal.userId,
        scope,
      ),
      policyRevision: policy.revision,
      issuedAt: checkedAt,
      expiresAt: Math.min(checkedAt + 30_000, membership.expiresAt),
    };
  }

  private commit(previous: AuthorizationPolicy, next: AuthorizationPolicy) {
    return this.repository.commit(previous.revision, {
      ...next,
      revision: previous.revision + 1,
    });
  }
}

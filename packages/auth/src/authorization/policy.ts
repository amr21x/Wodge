import { allPermissions } from "@wodge/auth/authorization/permissions";
import { authorizationError } from "@wodge/core/authorization/errors";
import type {
  AuthorizationPolicy,
  AuthorizationScope,
} from "@wodge/domain/authorization/models";
import type { Permissions } from "@wodge/domain/authorization/permissions";
import { createEntityId } from "@wodge/domain/identifiers";
import type { WorkspaceState } from "@wodge/domain/workspace/models";

export function scopeAncestry(
  workspaceId: string,
  state: WorkspaceState,
  scope: AuthorizationScope,
): AuthorizationScope[] {
  const workspace: AuthorizationScope = { type: "workspace", id: workspaceId };

  if (scope.type === "workspace") {
    return scope.id === workspaceId ? [workspace] : [];
  }

  for (const team of state.structure.teams) {
    const parent: AuthorizationScope = { type: "team", id: team.id };
    if (scope.type === "team" && scope.id === team.id) {
      return [workspace, parent];
    }

    const exists =
      scope.type === "room"
        ? team.rooms.some((room) => room.id === scope.id)
        : scope.type === "thread"
          ? team.threads.some((thread) => thread.id === scope.id)
          : scope.type === "page" &&
            team.folders.some((folder) =>
              folder.channels.some((page) => page.id === scope.id),
            );
    if (exists) {
      return [workspace, parent, scope];
    }
  }

  return [];
}

export function effectivePermissions(
  policy: AuthorizationPolicy,
  state: WorkspaceState,
  userId: string,
  scope: AuthorizationScope,
): Permissions {
  const ancestors = scopeAncestry(policy.workspaceId, state, scope);
  if (!ancestors.length) {
    return {};
  }
  const teams = new Set(
    state.structure.teams
      .filter((team) => team.members.includes(userId))
      .map((team) => team.id),
  );
  const permissions: Record<string, string[]> = {};

  for (const assignment of policy.assignments) {
    const subjectMatches =
      assignment.subject.type === "user"
        ? assignment.subject.id === userId
        : teams.has(assignment.subject.id);
    if (
      !subjectMatches ||
      !ancestors.some(
        (ancestor) =>
          ancestor.type === assignment.scope.type &&
          ancestor.id === assignment.scope.id,
      )
    ) {
      continue;
    }
    const role = policy.roles.find((item) => item.id === assignment.roleId);
    if (!role) {
      continue;
    }

    for (const [resource, actions] of Object.entries(role.permissions)) {
      permissions[resource] = [
        ...new Set([...(permissions[resource] ?? []), ...actions]),
      ];
    }
  }

  return permissions as Permissions;
}

export function containsPermissions(
  allowed: Permissions,
  requested: Permissions,
): boolean {
  const requests = Object.entries(requested);
  return (
    requests.some(([, actions]) => actions.length > 0) &&
    requests.every(([resource, actions]) =>
      actions.every((action) =>
        (
          allowed[resource as keyof Permissions] as
            | readonly string[]
            | undefined
        )?.includes(action),
      ),
    )
  );
}

export function assertApplicablePermissions(
  scope: AuthorizationScope,
  permissions: Permissions,
) {
  const allowed =
    scope.type === "workspace" || scope.type === "team"
      ? Object.keys(allPermissions())
      : scope.type === "room"
        ? ["room", "message", "role"]
        : [scope.type, "role"];
  if (
    Object.keys(permissions).some((resource) => !allowed.includes(resource))
  ) {
    throw authorizationError(
      "AUTHORIZATION_INVALID_INPUT",
      "Permissions do not apply to this scope",
    );
  }
}

// One-time compatibility import. New role changes do not write legacy groups or role flags.
export function initialPolicy(
  workspaceId: string,
  state: WorkspaceState,
): AuthorizationPolicy {
  const policy: AuthorizationPolicy = {
    schemaVersion: 1,
    workspaceId,
    revision: 1,
    roles: [],
    assignments: [],
  };
  const define = (
    system: NonNullable<AuthorizationPolicy["roles"][number]["system"]>,
    permissions: Permissions,
  ) => {
    const role = { id: createEntityId(), name: system, permissions, system };
    policy.roles.push(role);
    return role.id;
  };
  const owner = define("owner", allPermissions());
  const admin = define("administrator", allPermissions());
  const reader = define("reader", {
    room: ["read"],
    message: ["read", "vote"],
  });
  const editor = define("editor", {
    room: ["read"],
    message: ["read", "send", "editOwn", "deleteOwn", "vote"],
  });
  const moderator = define("moderator", {
    room: ["read"],
    message: ["read", "send", "editOwn", "deleteOwn", "moderate", "vote"],
  });
  const add = (
    roleId: string,
    subject: AuthorizationPolicy["assignments"][number]["subject"],
    scope: AuthorizationScope,
  ) => {
    if (
      policy.assignments.some(
        (item) =>
          item.roleId === roleId &&
          item.subject.type === subject.type &&
          item.subject.id === subject.id &&
          item.scope.type === scope.type &&
          item.scope.id === scope.id,
      )
    ) {
      return;
    }
    policy.assignments.push({ id: createEntityId(), roleId, subject, scope });
  };
  add(
    owner,
    { type: "user", id: state.members.createdBy },
    { type: "workspace", id: workspaceId },
  );

  for (const member of state.members.members) {
    if (member.role === "owner") {
      add(
        owner,
        { type: "user", id: member.id },
        { type: "workspace", id: workspaceId },
      );
    }
    if (member.role === "admin") {
      add(
        admin,
        { type: "user", id: member.id },
        { type: "workspace", id: workspaceId },
      );
    }
  }
  for (const team of state.structure.teams) {
    for (const userId of team.moderators) {
      add(
        moderator,
        { type: "user", id: userId },
        { type: "team", id: team.id },
      );
    }
    for (const room of team.rooms) {
      for (const [groups, roleId] of [
        [room.viewGroups, reader],
        [room.editGroups, editor],
      ] as const) {
        for (const groupId of groups) {
          if (groupId === "team-members") {
            add(
              roleId,
              { type: "team", id: team.id },
              { type: "room", id: room.id },
            );
          } else {
            for (const userId of state.structure.groups.find(
              (group) => group.id === groupId,
            )?.members ?? []) {
              if (team.members.includes(userId)) {
                add(
                  roleId,
                  { type: "user", id: userId },
                  { type: "room", id: room.id },
                );
              }
            }
          }
        }
      }
    }
  }
  return policy;
}

/** Organization roles supply workspace-level owner/admin access; resource roles remain local. */
export function reconcileOrganizationRoles(
  policy: AuthorizationPolicy,
  state: WorkspaceState,
): AuthorizationPolicy {
  const roles = policy.roles.filter(
    (role) => role.system === "owner" || role.system === "administrator",
  );
  const roleIds = new Set(roles.map((role) => role.id));
  const assignments = policy.assignments.filter(
    (assignment) =>
      !(
        roleIds.has(assignment.roleId) && assignment.scope.type === "workspace"
      ),
  );
  for (const member of state.members.members) {
    const system =
      member.role === "owner"
        ? "owner"
        : member.role === "admin"
          ? "administrator"
          : undefined;
    const role = roles.find((role) => role.system === system);
    if (role) {
      assignments.push({
        id: createEntityId(),
        roleId: role.id,
        subject: { type: "user", id: member.id },
        scope: { type: "workspace", id: policy.workspaceId },
      });
    }
  }
  return { ...policy, revision: policy.revision + 1, assignments };
}

import { allPermissions } from "@wodge/auth/authorization/permissions";
import { authorizationError } from "@wodge/core/authorization/errors";
import type {
  AuthorizationPolicy,
  AuthorizationScope,
  PermissionImport,
  RoleAssignment,
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

/** Team-scoped system moderator grants are backed by the current moderator list. */
function isCurrentTeamModeratorAssignment(
  policy: AuthorizationPolicy,
  state: WorkspaceState,
  assignment: RoleAssignment,
) {
  if (
    assignment.scope.type !== "team" ||
    assignment.subject.type !== "user" ||
    !policy.roles.some(
      (role) => role.id === assignment.roleId && role.system === "moderator",
    )
  )
    return true;
  return state.structure.teams.some(
    (team) =>
      team.id === assignment.scope.id &&
      team.moderators.includes(assignment.subject.id),
  );
}

export function reconcileTeamModeratorRoles(
  policy: AuthorizationPolicy,
  state: WorkspaceState,
): AuthorizationPolicy {
  const assignments = policy.assignments.filter((assignment) =>
    isCurrentTeamModeratorAssignment(policy, state, assignment),
  );
  return assignments.length === policy.assignments.length
    ? policy
    : { ...policy, revision: policy.revision + 1, assignments };
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
      !isCurrentTeamModeratorAssignment(policy, state, assignment) ||
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

// Bootstrap system roles and scoped assignments; legacy access arrives as migration projections.
export function initialPolicy(
  workspaceId: string,
  state: WorkspaceState,
  imports: readonly PermissionImport[] | null = null,
): AuthorizationPolicy {
  const policy: AuthorizationPolicy = {
    schemaVersion: 1,
    resourcesMigrated: true,
    workspaceId,
    revision: 1,
    roles: [],
    assignments: [],
  };
  const define = (
    system: NonNullable<AuthorizationPolicy["roles"][number]["system"]>,
    permissions: Permissions,
    name: string = system,
  ) => {
    const role = { id: createEntityId(), name, permissions, system };
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
    page: ["read", "update"],
    thread: ["read", "update"],
    team: ["read", "manageMembers"],
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
  }
  const pageReader = define("reader", { page: ["read"] }, "Page reader");
  const pageEditor = define(
    "editor",
    { page: ["read", "update"] },
    "Page editor",
  );
  const threadReader = define("reader", { thread: ["read"] }, "Thread reader");
  const threadEditor = define(
    "editor",
    { thread: ["read", "update"] },
    "Thread editor",
  );
  const roleFor = (
    kind: "room" | "page" | "thread",
    access: "read" | "update",
  ) =>
    kind === "room"
      ? access === "read"
        ? reader
        : editor
      : kind === "page"
        ? access === "read"
          ? pageReader
          : pageEditor
        : access === "read"
          ? threadReader
          : threadEditor;
  if (imports !== null) {
    for (const seed of imports)
      add(
        roleFor(seed.scope_type, seed.access),
        { type: seed.subject_type, id: seed.subject_id },
        { type: seed.scope_type, id: seed.scope_id },
      );
  } else {
    for (const team of state.structure.teams) {
      for (const resource of team.rooms) {
        add(
          reader,
          { type: "team", id: team.id },
          { type: "room", id: resource.id },
        );
        add(
          editor,
          { type: "team", id: team.id },
          { type: "room", id: resource.id },
        );
      }
      for (const resource of team.folders.flatMap((f) => f.channels))
        add(
          pageEditor,
          { type: "team", id: team.id },
          { type: "page", id: resource.id },
        );
      for (const resource of team.threads)
        add(
          threadEditor,
          { type: "team", id: team.id },
          { type: "thread", id: resource.id },
        );
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

/** Extend an existing room policy without replaying legacy room grants or changing custom roles. */
export function migrateResourcePolicy(
  policy: AuthorizationPolicy,
  state: WorkspaceState,
  imports: readonly PermissionImport[],
) {
  const seed = initialPolicy(
    policy.workspaceId,
    state,
    imports.filter((row) => row.scope_type !== "room"),
  );
  // Team moderators previously had page/thread access independently of the room policy.
  // Import only those capabilities so a revoked room moderator assignment stays revoked.
  seed.roles = seed.roles.map((role) =>
    role.system === "moderator"
      ? {
          ...role,
          name: "Resource moderator",
          permissions: {
            page: ["read", "update"],
            thread: ["read", "update"],
            team: ["read", "manageMembers"],
          },
        }
      : role,
  );
  const ids = new Set(
    seed.roles
      .filter(
        (role) =>
          role.system !== "owner" &&
          role.system !== "administrator" &&
          (role.permissions.page || role.permissions.thread),
      )
      .map((role) => role.id),
  );
  const assignments = seed.assignments.filter((assignment) =>
    ids.has(assignment.roleId),
  );
  return {
    ...extendResourceAssignments(policy, seed, assignments),
    resourcesMigrated: true,
  };
}

/** Reuse existing system roles when provisioning or importing resource assignments. */
export function extendResourceAssignments(
  policy: AuthorizationPolicy,
  seed: AuthorizationPolicy,
  assignments: AuthorizationPolicy["assignments"],
) {
  const roles = [...policy.roles];
  const added = assignments.map((assignment) => {
    const role = seed.roles.find(
      (candidate) => candidate.id === assignment.roleId,
    )!;
    let target = roles.find(
      (candidate) =>
        candidate.system === role.system &&
        JSON.stringify(candidate.permissions) ===
          JSON.stringify(role.permissions),
    );
    if (!target) {
      target = role;
      roles.push(role);
    }
    return { ...assignment, roleId: target.id };
  });
  const combined = [...policy.assignments];
  for (const assignment of added)
    if (
      !combined.some(
        (existing) =>
          existing.roleId === assignment.roleId &&
          existing.subject.type === assignment.subject.type &&
          existing.subject.id === assignment.subject.id &&
          existing.scope.type === assignment.scope.type &&
          existing.scope.id === assignment.scope.id,
      )
    )
      combined.push(assignment);
  return {
    ...policy,
    revision: policy.revision + 1,
    roles,
    assignments: combined,
  };
}

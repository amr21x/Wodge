import { roomServiceFixture } from "../helpers/services";
import { createObjectDatabase } from "@wodge/infra/database/object-database";
import { attachSql } from "../helpers/sqlite";
import {
  initialPolicy,
  migrateResourcePolicy,
  effectivePermissions,
} from "@wodge/auth/authorization/policy";
import { AuthorizationPolicies } from "@wodge/auth/authorization/policies";
import { AuthorizationRevocations } from "@wodge/auth/authorization/revocations";
import { WorkspaceAuthorization } from "@wodge/auth/authorization/service";
import { authorizationError } from "@wodge/core/authorization/errors";
import { AuthorizationRepository } from "@wodge/core/authorization/repositories/policy";
import { createDefaultTeam } from "@wodge/core/workspace/defaults";
import { CreateRoleSchema } from "@wodge/domain/authorization/validation";
import type { WorkspaceState } from "@wodge/domain/workspace/models";
import { describe, expect, test, vi } from "vitest";

function fixture() {
  const records = new Map<string, unknown>();
  const storage = {
    async get(key: string) {
      return structuredClone(records.get(key));
    },
    async put(key: string, value: unknown) {
      records.set(key, structuredClone(value));
    },
  } as unknown as DurableObjectStorage;
  const team = createDefaultTeam("owner");
  team.members.push("alice");
  const state = {
    members: {
      createdBy: "owner",
      members: [
        {
          id: "owner",
          role: "owner",
          joinInfo: {
            token: "",
            createdBy: "owner",
            joinedAt: new Date().toISOString(),
          },
        },
        {
          id: "alice",
          role: "member",
          joinInfo: {
            token: "",
            createdBy: "owner",
            joinedAt: new Date().toISOString(),
          },
        },
      ],
    },
    structure: { teams: [team] },
  } as WorkspaceState;
  const repository = new AuthorizationPolicies(
    new AuthorizationRepository(
      storage,
      "workspace",
      createObjectDatabase(attachSql(storage)),
    ),
  );
  const members = new Set(["owner", "alice"]);
  const memberships = {
    validate: vi.fn(async ({ userId }: { userId: string }) =>
      members.has(userId) ? { expiresAt: Date.now() + 30_000 } : null,
    ),
    hasMember: vi.fn(async (userId: string) => members.has(userId)),
  };
  const authorization = new WorkspaceAuthorization(
    repository,
    memberships,
    state,
    "workspace",
    {
      loadPermissionImports: async () => null,
      finishPermissionImport: async () => {},
    },
  );
  const access = (userId = "owner") => {
    const principal = { userId, sessionId: "session-" + userId };
    return {
      hasPermission: (
        input: Parameters<WorkspaceAuthorization["hasPermission"]>[0],
      ) => authorization.hasPermission(input, principal),
      requirePermission: (
        input: Parameters<WorkspaceAuthorization["requirePermission"]>[0],
      ) => authorization.requirePermission(input, principal),
      createRole: (
        input: Parameters<WorkspaceAuthorization["createRole"]>[0],
      ) => authorization.createRole(input, principal),
      updateRole: (
        input: Parameters<WorkspaceAuthorization["updateRole"]>[0],
      ) => authorization.updateRole(input, principal),
      deleteRole: (
        input: Parameters<WorkspaceAuthorization["deleteRole"]>[0],
      ) => authorization.deleteRole(input, principal),
      assignRole: (
        input: Parameters<WorkspaceAuthorization["assignRole"]>[0],
      ) => authorization.assignRole(input, principal),
      removeRole: (
        input: Parameters<WorkspaceAuthorization["removeRole"]>[0],
      ) => authorization.removeRole(input, principal),
      resolveGrant: (
        input: Parameters<WorkspaceAuthorization["resolveGrant"]>[0],
      ) => authorization.resolveGrant(input, principal),
      listRoles: () => authorization.listRoles(principal),
      synchronizeOrganizationRoles: () =>
        authorization.synchronizeOrganizationRoles(),
    };
  };
  return {
    access,
    repository,
    storage,
    records,
    state,
    team,
    members,
    memberships,
  };
}

describe("workspace authorization", () => {
  test("imports existing room access once and persists a versioned policy with an outbox", async () => {
    const { access, repository, team, storage } = fixture();
    expect(
      await access("alice").hasPermission({
        scope: { type: "room", id: team.rooms[0]!.id },
        permissions: { message: ["send"] },
      }),
    ).toEqual({ success: true });
    const saved = await repository.read();
    expect(saved).toMatchObject({
      schemaVersion: 1,
      revision: 1,
      workspaceId: "workspace",
    });
    expect((await repository.pendingInvalidations())[0]).toMatchObject({
      revision: 1,
    });
    vi.spyOn(storage, "get").mockRejectedValue(new Error("Unexpected KV read"));
    vi.spyOn(storage, "put").mockRejectedValue(
      new Error("Unexpected KV write"),
    );
    expect(
      await new AuthorizationRepository(
        storage,
        "workspace",
        createObjectDatabase(attachSql(storage)),
      ).read(),
    ).toEqual(saved);
  });

  test("policy changes and invalidations roll back together when the SQL outbox write fails", async () => {
    const { access, repository, storage } = fixture();
    await access().listRoles();
    const previous = await repository.read();
    const pending = await repository.pendingInvalidations();
    const exec = vi.mocked(storage.sql.exec).getMockImplementation()!;
    vi.mocked(storage.sql.exec).mockImplementation((query, ...bindings) => {
      if (/^insert into "authorization_outbox"/i.test(query))
        throw new Error("outbox unavailable");
      return exec(query, ...bindings);
    });
    await expect(
      access().createRole({
        name: "Uncommitted",
        permissions: { message: ["send"] },
      }),
    ).rejects.toThrow();
    expect(await repository.read()).toEqual(previous);
    expect(await repository.pendingInvalidations()).toEqual(pending);
  });

  test("creates custom roles, combines applicable assignments and protects unrelated scopes", async () => {
    const { access, team, state } = fixture();
    const other = createDefaultTeam("owner");
    state.structure.teams.push(other);
    const owner = access();
    const role = await owner.createRole({
      name: "Role viewer",
      permissions: { role: ["read"] },
    });
    expect(role.id).toMatch(/^[0-9a-f-]{14}7/);
    await owner.assignRole({
      roleId: role.id,
      subject: { type: "team", id: team.id },
      scope: { type: "team", id: team.id },
    });
    expect(
      await access("alice").hasPermission({
        scope: { type: "team", id: team.id },
        permissions: { role: ["read"], message: ["send"] },
      }),
    ).toEqual({ success: false, code: "AUTHORIZATION_FORBIDDEN" });
    expect(
      await access("alice").hasPermission({
        scope: { type: "team", id: team.id },
        permissions: { role: ["read"] },
      }),
    ).toEqual({ success: true });
    expect(
      await access("alice").hasPermission({
        scope: { type: "team", id: other.id },
        permissions: { role: ["read"] },
      }),
    ).toEqual({ success: false, code: "AUTHORIZATION_FORBIDDEN" });
    const reconstructed = access("alice");
    expect(
      await reconstructed.hasPermission({
        scope: { type: "workspace", id: "foreign" },
        permissions: { role: ["read"] },
      }),
    ).toEqual({ success: false, code: "AUTHORIZATION_FORBIDDEN" });
  });

  test("prevents privilege escalation, system-role edits and removal of the owner", async () => {
    const { access } = fixture();
    await expect(
      access("alice").createRole({
        name: "Admin",
        permissions: { role: ["create"] },
      }),
    ).rejects.toMatchObject({ code: "AUTHORIZATION_FORBIDDEN" });
    const { roles, assignments } = await access().listRoles();
    const owner = roles.find((role) => role.system === "owner")!;
    await expect(
      access().updateRole({
        roleId: owner.id,
        name: "Changed",
        permissions: { room: ["read"] },
      }),
    ).rejects.toMatchObject({ code: "AUTHORIZATION_FORBIDDEN" });
    await expect(
      access().deleteRole({ roleId: owner.id }),
    ).rejects.toMatchObject({ code: "AUTHORIZATION_FORBIDDEN" });
    await expect(
      access().removeRole({
        assignmentId: assignments.find((item) => item.roleId === owner.id)!.id,
      }),
    ).rejects.toMatchObject({ code: "AUTHORIZATION_FORBIDDEN" });
    expect(
      CreateRoleSchema.safeParse({
        name: "Invalid",
        permissions: { message: ["unknown-action"] },
      }).success,
    ).toBe(false);
  });

  test("requires active organization membership even with an assigned role", async () => {
    const { access, members, team } = fixture();
    await access("alice").requirePermission({
      scope: { type: "room", id: team.rooms[0]!.id },
      permissions: { room: ["read"] },
    });
    members.delete("alice");
    await expect(
      access("alice").requirePermission({
        scope: { type: "room", id: team.rooms[0]!.id },
        permissions: { room: ["read"] },
      }),
    ).rejects.toMatchObject({ code: "AUTHORIZATION_FORBIDDEN" });
  });

  test("supports resource-scoped assignment and refuses deletion of assigned roles", async () => {
    const { access, team } = fixture();
    const owner = access();
    const role = await owner.createRole({
      name: "Room moderator",
      permissions: { message: ["moderate"] },
    });
    const assignment = await owner.assignRole({
      roleId: role.id,
      subject: { type: "user", id: "alice" },
      scope: { type: "room", id: team.rooms[0]!.id },
    });
    expect(
      await access("alice").hasPermission({
        scope: assignment.scope,
        permissions: { message: ["moderate"] },
      }),
    ).toEqual({ success: true });
    await expect(owner.deleteRole({ roleId: role.id })).rejects.toMatchObject({
      code: "AUTHORIZATION_CONFLICT",
    });
    await owner.removeRole({ assignmentId: assignment.id });
    await owner.deleteRole({ roleId: role.id });
    expect(
      await access("alice").hasPermission({
        scope: assignment.scope,
        permissions: { message: ["moderate"] },
      }),
    ).toEqual({ success: false, code: "AUTHORIZATION_FORBIDDEN" });
  });

  test("compare-and-save rejects stale edits while preserving policy and pending events", async () => {
    const { access, repository } = fixture();
    await access().listRoles();
    const previous = (await repository.read())!;
    await repository.commit(previous.revision, {
      ...previous,
      revision: previous.revision + 1,
    });
    await expect(
      repository.commit(previous.revision, {
        ...previous,
        revision: previous.revision + 1,
      }),
    ).rejects.toMatchObject({ code: "AUTHORIZATION_CONFLICT" });
    const pending = await repository.pendingInvalidations();
    expect(pending).toHaveLength(2);
    await repository.acknowledgeInvalidation(pending[0]!.id);
    expect((await repository.read())!.revision).toBe(2);
    expect(await repository.pendingInvalidations()).toEqual([pending[1]]);
  });
});

test("combines separate role grants and blocks a delegated manager from granting stronger permissions", async () => {
  const { access, team } = fixture();
  const owner = access();
  const roleA = await owner.createRole({
    name: "Read roles",
    permissions: { role: ["read"] },
  });
  const roleB = await owner.createRole({
    name: "Create roles",
    permissions: { role: ["create"] },
  });
  for (const role of [roleA, roleB]) {
    await owner.assignRole({
      roleId: role.id,
      subject: { type: "user", id: "alice" },
      scope: { type: "workspace", id: "workspace" },
    });
  }
  expect(
    await access("alice").hasPermission({
      scope: { type: "workspace", id: "workspace" },
      permissions: { role: ["read", "create"] },
    }),
  ).toEqual({ success: true });
  await expect(
    access("alice").createRole({
      name: "Escalated moderator",
      permissions: { message: ["moderate"] },
    }),
  ).rejects.toMatchObject({ code: "AUTHORIZATION_FORBIDDEN" });
  await expect(
    owner.assignRole({
      roleId: roleA.id,
      subject: { type: "team", id: "foreign-team" },
      scope: { type: "team", id: team.id },
    }),
  ).rejects.toMatchObject({ code: "AUTHORIZATION_NOT_FOUND" });
});

test("editOwn and deleteOwn use the stored author even when request metadata is forged", async () => {
  const { RoomService } = await import("@wodge/core/rooms/services/messages");
  const { MessageSchema } = await import("@wodge/domain/rooms/validation");
  const message = MessageSchema.parse({
    id: "private",
    sender: "alice",
    content: "Original",
    date: new Date().toISOString(),
  });
  const { service, repository } = roomServiceFixture([message]);
  const save = vi.spyOn(repository, "delete");
  const attacker = {
    userId: "bob",
    isOwner: true,
    isAdmin: true,
    isTeamModerator: true,
    canEdit: true,
    canView: true,
    permissions: {
      message: ["editOwn", "deleteOwn"] as ("editOwn" | "deleteOwn")[],
    },
  };
  await expect(
    service.editMessage(
      { message: { ...message, sender: "bob" }, newContent: "Forged" },
      attacker,
    ),
  ).rejects.toMatchObject({ code: "ROOM_FORBIDDEN" });
  await expect(
    service.deleteMessage({ ...message, sender: "bob" }, attacker),
  ).rejects.toMatchObject({ code: "ROOM_FORBIDDEN" });
  expect(save).not.toHaveBeenCalled();
  await service.deleteMessage(message, {
    ...attacker,
    permissions: { message: ["moderate"] },
  });
  expect(save).toHaveBeenCalledWith(message.id);
});

test("membership removal discards explicit user assignments before a later rejoin", async () => {
  const { access, repository, team } = fixture();
  const role = await access().createRole({
    name: "Temporary moderator",
    permissions: { message: ["moderate"] },
  });
  const scope = { type: "room", id: team.rooms[0]!.id } as const;
  await access().assignRole({
    roleId: role.id,
    subject: { type: "user", id: "alice" },
    scope,
  });
  await new AuthorizationRevocations(repository).revokeUserAssignments("alice");
  expect(
    (await repository.read())!.assignments.some(
      (assignment) =>
        assignment.subject.type === "user" && assignment.subject.id === "alice",
    ),
  ).toBe(false);
  expect(
    await access("alice").hasPermission({
      scope,
      permissions: { message: ["moderate"] },
    }),
  ).toEqual({ success: false, code: "AUTHORIZATION_FORBIDDEN" });
});

test("assignment revocation retries a policy revision conflict using fresh state", async () => {
  const { access, repository } = fixture();
  await access().createRole({
    name: "Role",
    permissions: { message: ["send"] },
  });
  const policy = (await repository.read())!;
  const read = vi
    .fn()
    .mockResolvedValueOnce(policy)
    .mockResolvedValue({ ...policy, revision: policy.revision + 1 });
  const commit = vi
    .fn()
    .mockRejectedValueOnce(
      authorizationError("AUTHORIZATION_CONFLICT", "Concurrent policy change"),
    )
    .mockResolvedValue(undefined);
  await new AuthorizationRevocations({ read, commit }).revokeUserAssignments(
    "alice",
  );
  expect(commit).toHaveBeenLastCalledWith(policy.revision + 1, {
    ...policy,
    revision: policy.revision + 2,
  });
});

test("upgrading an existing policy preserves custom roles and revoked room grants", () => {
  const { state, team } = fixture();
  const policy = initialPolicy("workspace", state);
  delete policy.resourcesMigrated;
  policy.assignments = policy.assignments.filter(
    (a) => a.scope.type !== "room" && a.scope.type !== "page",
  );
  policy.roles.push({
    id: "custom",
    name: "Custom",
    permissions: { thread: ["read"] },
  });
  const upgraded = migrateResourcePolicy(policy, state, [
    {
      scope_type: "page",
      scope_id: team.folders[0]!.channels[0]!.id,
      subject_type: "user",
      subject_id: "alice",
      access: "read",
    },
    {
      scope_type: "room",
      scope_id: team.rooms[0]!.id,
      subject_type: "user",
      subject_id: "alice",
      access: "update",
    },
  ]);
  expect(upgraded.roles).toContainEqual(policy.roles.at(-1));
  expect(
    effectivePermissions(upgraded, state, "alice", {
      type: "room",
      id: team.rooms[0]!.id,
    }),
  ).toEqual({});
  expect(
    effectivePermissions(upgraded, state, "alice", {
      type: "page",
      id: team.folders[0]!.channels[0]!.id,
    }),
  ).toEqual({ page: ["read"] });
  team.moderators.push("alice");
  const moderatorUpgrade = migrateResourcePolicy(policy, state, []);
  const permissions = effectivePermissions(moderatorUpgrade, state, "alice", {
    type: "room",
    id: team.rooms[0]!.id,
  });
  expect(permissions).not.toHaveProperty("room");
  expect(permissions).not.toHaveProperty("message");
});

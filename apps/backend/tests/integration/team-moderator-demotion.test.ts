// @vitest-environment node
import { expect, test, vi } from "vitest";
import { WorkspaceAuthorization } from "@wodge/auth/authorization/service";
import { AuthorizationPolicies } from "@wodge/auth/authorization/policies";
import { WorkspaceMutationAccess } from "@wodge/auth/authorization/workspace-mutations";
import { initialPolicy } from "@wodge/auth/authorization/policy";
import { WorkspaceRecordRepository } from "@wodge/core/workspace/repositories/records";
import { createDefaultTeam } from "@wodge/core/workspace/defaults";
import { createEntityId } from "@wodge/domain/identifiers";
import {
  makeWorkspaceMembersKey,
  makeWorkspaceStructureKey,
} from "@wodge/domain/sync/index";
import type { WorkspaceState } from "@wodge/domain/workspace/models";
import type WorkspaceServer from "../../src/servers/workspace";
import { workspaceBindings } from "../helpers/bindings";
import { attachSql } from "../helpers/sqlite";

const owner = {
  userId: "owner",
  isOwner: true,
  isAdmin: false,
  isTeamModerator: false,
  canEdit: true,
  canView: true,
};
const alice = { ...owner, userId: "alice", isOwner: false };
const record = <T>(data: T) => ({
  data,
  lastModifiedVersion: 0,
  deleted: false,
});

async function fixture(migrated = false) {
  const team = createDefaultTeam("owner"),
    other = createDefaultTeam("owner");
  for (const item of [team, other]) {
    item.members.push("alice");
    item.moderators.push("alice");
  }
  const state: WorkspaceState = {
    members: {
      createdBy: "owner",
      members: ["owner", "alice"].map((id) => ({
        id,
        role: id === "owner" ? "owner" : "member",
        joinInfo: {
          token: "",
          createdBy: "owner",
          joinedAt: new Date().toISOString(),
        },
      })),
    },
    structure: { teams: [team, other] },
  };
  const legacy = new Map<string, unknown>([
    [makeWorkspaceMembersKey(), record(state.members)],
    [makeWorkspaceStructureKey(), record(state.structure)],
  ]);
  const storage = attachSql({
    get: vi.fn(async (key: string) => structuredClone(legacy.get(key))),
    put: vi.fn(async () => {
      throw new Error("Unexpected KV write");
    }),
    list: async () => new Map(),
  });
  const party = {
    name: "workspace",
    workspaceMembers: record(state.members),
    workspaceStructure: record(state.structure),
    versions: new Map([
      ["globalVersion", 0],
      ["workspaceInfo", 0],
    ]),
    presenceMap: new Map(),
    ctx: { storage },
    env: {},
    poke: vi.fn(),
  } as unknown as WorkspaceServer;
  const scope = workspaceBindings(party);
  await scope.container.resolve(WorkspaceRecordRepository).loadWorkspace();
  const policies = scope.container.resolve(AuthorizationPolicies);
  const authorization = scope.container.resolve(WorkspaceAuthorization);
  const access = scope.container.resolve(WorkspaceMutationAccess);
  const policy = initialPolicy("workspace", state, []);
  const pageId = team.folders[0]!.channels[0]!.id;
  const customRoleId = createEntityId(),
    customAssignmentId = createEntityId();
  policy.roles.push({
    id: customRoleId,
    name: "Page reader",
    permissions: { page: ["read"] },
  });
  policy.assignments.push({
    id: customAssignmentId,
    roleId: customRoleId,
    subject: { type: "user", id: "alice" },
    scope: { type: "page", id: pageId },
  });
  if (migrated) {
    policy.resourcesMigrated = false;
    for (const role of policy.roles)
      if (role.system === "moderator")
        role.permissions = {
          room: ["read"],
          message: ["read", "send", "moderate"],
        };
  }
  await policies.commit(0, policy);
  const demote = () =>
    scope.sync.run(
      {
        userId: "owner",
        nextVersion: 1,
        mutation: {
          id: 1,
          clientID: "client",
          name: "updateTeam",
          args: {
            teamId: team.id,
            teamUpdate: {
              action: "changeTeamMemberRole",
              update: { memberId: "alice", role: "teamMember" },
            },
          },
        },
      },
      owner,
    );
  return {
    scope,
    storage,
    party,
    policies,
    authorization,
    access,
    team,
    other,
    pageId,
    customAssignmentId,
    demote,
  };
}

test.each([false, true])(
  "demotion revokes bootstrap/migrated moderator privileges and persists policy cleanup (migrated=%s)",
  async (migrated) => {
    const f = await fixture(migrated);
    try {
      expect(
        (
          await f.authorization.permissionsForUser("alice", {
            type: "page",
            id: f.pageId,
          })
        ).page,
      ).toContain("update");
      await expect(
        f.access.authorize("updateTeam", { teamId: f.team.id }, alice),
      ).resolves.toMatchObject({ isTeamModerator: true });
      const before = (await f.policies.read())!;
      await f.demote();
      expect(
        f.party.workspaceStructure.data.teams[0]!.moderators,
      ).not.toContain("alice");
      expect(
        (
          await f.authorization.permissionsForUser("alice", {
            type: "page",
            id: f.pageId,
          })
        ).page,
      ).toEqual(["read"]);
      await expect(
        f.access.authorize("createRoom", { teamId: f.team.id }, alice),
      ).rejects.toMatchObject({ code: "WORKSPACE_FORBIDDEN" });
      await expect(
        f.access.authorize("updateTeam", { teamId: f.team.id }, alice),
      ).rejects.toMatchObject({ code: "WORKSPACE_FORBIDDEN" });
      const policy = (await f.policies.read())!;
      const moderatorRoles = new Set(
        policy.roles
          .filter((role) => role.system === "moderator")
          .map((role) => role.id),
      );
      expect(
        policy.assignments.some(
          (a) =>
            a.subject.id === "alice" &&
            a.scope.id === f.team.id &&
            moderatorRoles.has(a.roleId),
        ),
      ).toBe(false);
      expect(
        policy.assignments.some((a) => a.id === f.customAssignmentId),
      ).toBe(true);
      expect(
        (
          await f.authorization.permissionsForUser("alice", {
            type: "team",
            id: f.other.id,
          })
        ).team,
      ).toContain("manageMembers");
      expect(policy.revision).toBeGreaterThan(before.revision);
      expect(
        (await f.policies.pendingInvalidations()).some(
          (event) => event.revision === policy.revision,
        ),
      ).toBe(true);
      const restored = workspaceBindings(f.party);
      try {
        expect(
          await restored.container.resolve(AuthorizationPolicies).read(),
        ).toEqual(policy);
      } finally {
        await restored.dispose();
      }
    } finally {
      await f.scope.dispose();
    }
  },
);

test("failed policy cleanup denies stale moderator permissions and is repaired on retry", async () => {
  const f = await fixture();
  try {
    const commit = vi
      .spyOn(f.policies, "commit")
      .mockRejectedValueOnce(new Error("policy unavailable"));
    await expect(f.demote()).rejects.toThrow("policy unavailable");
    expect(f.party.workspaceStructure.data.teams[0]!.moderators).not.toContain(
      "alice",
    );
    expect(
      (
        await f.authorization.permissionsForUser("alice", {
          type: "page",
          id: f.pageId,
        })
      ).page,
    ).not.toContain("update");
    await expect(
      f.access.authorize("updateTeam", { teamId: f.team.id }, alice),
    ).rejects.toMatchObject({ code: "WORKSPACE_FORBIDDEN" });
    commit.mockRestore();
    await f.demote();
    const saved = (await f.policies.read())!;
    const moderatorRoles = new Set(
      saved.roles
        .filter((role) => role.system === "moderator")
        .map((role) => role.id),
    );
    expect(
      saved.assignments.some(
        (a) =>
          a.subject.id === "alice" &&
          a.scope.id === f.team.id &&
          moderatorRoles.has(a.roleId),
      ),
    ).toBe(false);
  } finally {
    await f.scope.dispose();
  }
});

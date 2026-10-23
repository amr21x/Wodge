import { expect, test } from "vitest";
import { createDefaultTeam } from "@wodge/core/workspace/defaults";
import {
  initialPolicy,
  effectivePermissions,
  containsPermissions,
} from "@wodge/auth/authorization/policy";
import {
  isTeamMember,
  isTeamModerator,
} from "@wodge/auth/authorization/access";

const team = createDefaultTeam("owner");
team.members.push("alice");
const state = {
  members: { createdBy: "owner", members: [] },
  structure: { teams: [team] },
};
test("team membership remains explicit", () => {
  expect(
    isTeamMember({
      structure: state.structure,
      teamId: team.id,
      userId: "alice",
    }),
  ).toBe(true);
  expect(
    isTeamMember({
      structure: state.structure,
      teamId: team.id,
      userId: "outsider",
    }),
  ).toBe(false);
  expect(
    isTeamModerator({
      structure: state.structure,
      teamId: team.id,
      userId: "alice",
    }),
  ).toBe(false);
});
test("scoped page roles grant access through teams and revoke when membership or assignment is removed", () => {
  const policy = initialPolicy("workspace", state);
  const scope = { type: "page" as const, id: team.folders[0]!.channels[0]!.id };
  expect(
    containsPermissions(effectivePermissions(policy, state, "alice", scope), {
      page: ["read", "update"],
    }),
  ).toBe(true);
  expect(effectivePermissions(policy, state, "outsider", scope)).toEqual({});
  policy.assignments = policy.assignments.filter(
    (a) => a.scope.id !== scope.id,
  );
  expect(effectivePermissions(policy, state, "alice", scope)).toEqual({});
});

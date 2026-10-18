import { beforeAll, describe, expect, test } from "vitest";
import {
  createTestChannel,
  createTestGroup,
  createTestMembers,
  createTestStructure,
  createTestTeam,
} from "../../../core/tests/fixtures/workspace";
import { WorkspaceStructure } from "@wodge/domain/workspace/models";
import { createTeamMutation } from "@wodge/core/workspace/mutations/create-team";
import { UserId } from "../../../core/tests/fixtures/users";
import {
  canEdit,
  canView,
  isTeamMember,
  isTeamModerator,
} from "@wodge/auth/authorization/access";
import { teamUpdateRunner } from "@wodge/core/workspace/mutations/team-update-runner";
import { createGroupMutation } from "@wodge/core/workspace/mutations/create-group";
import { nanoid } from "nanoid";
import {
  LEGACY_ENTITY_ID_LENGTH,
  LEGACY_TEAM_ID_LENGTH,
} from "@wodge/domain/constants";
import { createPageMutation } from "@wodge/core/workspace/mutations/create-page";
import { groupUpdateRunner } from "@wodge/core/workspace/mutations/group-update-runner";

// const structure = createTestStructure();

let newStructure: WorkspaceStructure;

describe("RBAC test suite", () => {
  beforeAll(() => {
    newStructure = createTeamMutation({
      team: createTestTeam(),
      structure: createTestStructure(),
      currentUserId: UserId,
    });
  });

  test("Team membership", () => {
    expect(
      isTeamMember({
        structure: newStructure,
        userId: UserId,
        teamId: newStructure.teams[0]!.id,
      }),
    ).toBe(true);

    expect(
      isTeamMember({
        structure: newStructure,
        userId: UserId,
        teamId: "non-existing-team-id",
      }),
    ).toBe(false);

    expect(
      isTeamMember({
        structure: newStructure,
        userId: "non-existing-user-id",
        teamId: newStructure.teams[0]!.id,
      }),
    ).toBe(false);
  });

  test("Team moderator", () => {
    const struc = teamUpdateRunner({
      teamId: newStructure.teams[0]!.id,
      curMembers: newStructure.teams[0]!.members,
      structure: newStructure,
      teamUpdate: {
        action: "changeTeamMemberRole",
        update: {
          memberId: UserId,
          role: "moderator",
        },
      },
    }) as WorkspaceStructure;

    expect(
      isTeamModerator({
        structure: struc,
        userId: UserId,
        teamId: newStructure.teams[0]!.id,
      }),
    ).toBe(true);

    expect(
      isTeamModerator({
        structure: struc,
        userId: UserId,
        teamId: "non-existing-team-id",
      }),
    ).toBe(false);

    expect(
      isTeamModerator({
        structure: struc,
        userId: "non-existing-user-id",
        teamId: newStructure.teams[0]!.id,
      }),
    ).toBe(false);
  });

  test("Can edit", () => {
    const grpId = nanoid(LEGACY_TEAM_ID_LENGTH);
    let struc = createGroupMutation({
      group: createTestGroup({
        members: [UserId],
        id: grpId,
      }),
      structure: newStructure,
      currentUserId: UserId,
    });

    struc = groupUpdateRunner({
      curMembers: [UserId],
      groupId: grpId,
      structure: struc,
      groupUpdate: {
        action: "addMembers",
        update: {
          members: [UserId],
        },
      },
    }) as WorkspaceStructure;

    const chanId = nanoid(LEGACY_ENTITY_ID_LENGTH);
    const chanId2 = nanoid(LEGACY_ENTITY_ID_LENGTH);
    const chanId3 = nanoid(LEGACY_ENTITY_ID_LENGTH);

    // default page for all team members

    struc = createPageMutation({
      page: createTestChannel({ id: chanId }),
      structure: struc,
      teamId: newStructure.teams[0]!.id,
      folderId: "root-" + newStructure.teams[0]!.id,
    });

    expect(
      canEdit({
        structure: struc,
        userId: UserId,
        teamId: newStructure.teams[0]!.id,
        channelId: chanId,
        channelType: "page",
        folderId: "root-" + newStructure.teams[0]!.id,
        members: createTestMembers(),
      }),
    ).toBe(true);

    struc = createPageMutation({
      page: createTestChannel({ id: chanId2, editGroups: [] }),
      structure: struc,
      teamId: newStructure.teams[0]!.id,
      folderId: "root-" + newStructure.teams[0]!.id,
    });

    expect(
      canEdit({
        structure: struc,
        userId: UserId,
        teamId: newStructure.teams[0]!.id,
        channelId: chanId2,
        channelType: "page",
        folderId: "root-" + newStructure.teams[0]!.id,
        members: createTestMembers(),
      }),
    ).toBe(false);

    struc = createPageMutation({
      page: createTestChannel({ id: chanId3, editGroups: [grpId] }),
      structure: struc,
      teamId: newStructure.teams[0]!.id,
      folderId: "root-" + newStructure.teams[0]!.id,
    });

    expect(
      canEdit({
        structure: struc,
        userId: UserId,
        teamId: newStructure.teams[0]!.id,
        channelId: chanId3,
        channelType: "page",
        folderId: "root-" + newStructure.teams[0]!.id,
        members: createTestMembers(),
      }),
    ).toBe(true);
  });

  test("Can view", () => {
    const grpId = nanoid(LEGACY_TEAM_ID_LENGTH);
    let struc = createGroupMutation({
      group: createTestGroup({
        members: [UserId],
        id: grpId,
      }),
      structure: newStructure,
      currentUserId: UserId,
    });

    struc = groupUpdateRunner({
      curMembers: [UserId],
      groupId: grpId,
      structure: struc,
      groupUpdate: {
        action: "addMembers",
        update: {
          members: [UserId],
        },
      },
    }) as WorkspaceStructure;

    const chanId = nanoid(LEGACY_ENTITY_ID_LENGTH);
    const chanId2 = nanoid(LEGACY_ENTITY_ID_LENGTH);
    const chanId3 = nanoid(LEGACY_ENTITY_ID_LENGTH);

    // default page for all team members

    struc = createPageMutation({
      page: createTestChannel({ id: chanId }),
      structure: struc,
      teamId: newStructure.teams[0]!.id,
      folderId: "root-" + newStructure.teams[0]!.id,
    });

    expect(
      canView({
        structure: struc,
        userId: UserId,
        teamId: newStructure.teams[0]!.id,
        channelId: chanId,
        channelType: "page",
        folderId: "root-" + newStructure.teams[0]!.id,
        members: createTestMembers(),
      }),
    ).toBe(true);

    struc = createPageMutation({
      page: createTestChannel({ id: chanId2, viewGroups: [] }),
      structure: struc,
      teamId: newStructure.teams[0]!.id,
      folderId: "root-" + newStructure.teams[0]!.id,
    });

    expect(
      canView({
        structure: struc,
        userId: UserId,
        teamId: newStructure.teams[0]!.id,
        channelId: chanId2,
        channelType: "page",
        folderId: "root-" + newStructure.teams[0]!.id,
        members: createTestMembers(),
      }),
    ).toBe(false);

    struc = createPageMutation({
      page: createTestChannel({ id: chanId3, viewGroups: [grpId] }),
      structure: struc,
      teamId: newStructure.teams[0]!.id,
      folderId: "root-" + newStructure.teams[0]!.id,
    });

    expect(
      canView({
        structure: struc,
        userId: UserId,
        teamId: newStructure.teams[0]!.id,
        channelId: chanId3,
        channelType: "page",
        folderId: "root-" + newStructure.teams[0]!.id,
        members: createTestMembers(),
      }),
    ).toBe(true);
  });
});
